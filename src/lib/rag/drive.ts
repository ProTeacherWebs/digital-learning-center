import { readFileSync } from "node:fs";
import path from "node:path";
import { auth, drive as driveClient, type drive_v3 } from "@googleapis/drive";
import {
  isIgnoredName,
  isReadable,
  parseDocument,
  type DocumentSource,
  type SourceDocument,
} from "./source";

const FOLDER = "application/vnd.google-apps.folder";
const GOOGLE_DOC = "application/vnd.google-apps.document";
const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
/** Concurrent callers (the assistant, the catalog, the footer) share one listing for this long. */
const LIST_TTL_MS = 5_000;

export type DriveCredentials = { keyFile?: string; json?: string };

export type DriveFile = {
  id: string;
  name: string;
  /** Path inside the root folder, e.g. "faq/prices.xlsx". */
  path: string;
  /** Extension of what is downloaded: Google Docs become ".txt", Google Sheets ".xlsx". */
  ext: string;
  mimeType: string;
  /** Changes whenever the content changes. */
  version: string;
};

/** A read-only view of one Drive folder (with its subfolders), shared by the assistant and the site. */
export class DriveFolder {
  private client: drive_v3.Drive | null = null;
  private listing: { at: number; files: Promise<DriveFile[]> } | null = null;
  private readonly bytesCache = new Map<string, { version: string; data: Buffer }>();

  constructor(
    private readonly folderId: string,
    private readonly credentials: DriveCredentials,
  ) {}

  private drive() {
    if (!this.client) {
      const { keyFile, json } = this.credentials;
      const key = JSON.parse(json ?? readFileSync(keyFile!, "utf8"));
      this.client = driveClient({
        version: "v3",
        auth: new auth.JWT({
          email: key.client_email,
          key: key.private_key,
          scopes: ["https://www.googleapis.com/auth/drive.readonly"],
        }),
      });
    }
    return this.client;
  }

  private async walk(folderId: string, prefix: string, out: DriveFile[]) {
    let pageToken: string | undefined;
    do {
      const res = await this.drive().files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "nextPageToken, files(id, name, mimeType, modifiedTime, md5Checksum)",
        pageSize: 200,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      for (const f of res.data.files ?? []) {
        const { id, name, mimeType } = f;
        if (!id || !name || !mimeType || isIgnoredName(name)) continue;
        const filePath = prefix + name;
        if (mimeType === FOLDER) {
          await this.walk(id, `${filePath}/`, out);
          continue;
        }
        const ext =
          mimeType === GOOGLE_DOC
            ? ".txt"
            : mimeType === GOOGLE_SHEET
              ? ".xlsx"
              : path.extname(name).toLowerCase();
        if (!isReadable(ext)) continue;
        out.push({
          id,
          name,
          path: filePath,
          ext,
          mimeType,
          version: f.md5Checksum ?? f.modifiedTime ?? "",
        });
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  }

  files(): Promise<DriveFile[]> {
    if (!this.listing || Date.now() - this.listing.at > LIST_TTL_MS) {
      const files = (async () => {
        const out: DriveFile[] = [];
        await this.walk(this.folderId, "", out);
        return out;
      })();
      this.listing = { at: Date.now(), files };
      // A failed listing must not be reused.
      files.catch(() => (this.listing = null));
    }
    return this.listing.files;
  }

  /** The bytes of a file, downloaded again only when its version changed. */
  async bytes(file: DriveFile): Promise<Buffer> {
    const cached = this.bytesCache.get(file.id);
    if (cached?.version === file.version) return cached.data;

    const drive = this.drive();
    const res =
      file.mimeType === GOOGLE_DOC
        ? await drive.files.export({ fileId: file.id, mimeType: "text/plain" }, { responseType: "arraybuffer" })
        : file.mimeType === GOOGLE_SHEET
          ? await drive.files.export({ fileId: file.id, mimeType: XLSX }, { responseType: "arraybuffer" })
          : await drive.files.get(
              { fileId: file.id, alt: "media", supportsAllDrives: true },
              { responseType: "arraybuffer" },
            );
    const data = Buffer.from(res.data as ArrayBuffer);
    this.bytesCache.set(file.id, { version: file.version, data });
    return data;
  }

  /** A file by its name or path in the folder, or null when it is not there. */
  async file(name: string): Promise<{ buffer: Buffer; version: string } | null> {
    const found = (await this.files()).find((f) => f.path === name || f.name === name);
    return found ? { buffer: await this.bytes(found), version: found.version } : null;
  }
}

export class GoogleDriveSource implements DocumentSource {
  readonly name = "google-drive";
  private readonly parsed = new Map<string, SourceDocument>();

  constructor(private readonly folder: DriveFolder) {}

  async list(): Promise<SourceDocument[]> {
    const files = await this.folder.files();
    const docs = await Promise.all(
      files.map(async (file) => {
        try {
          let doc = this.parsed.get(file.id);
          if (doc?.version !== file.version) {
            const text = await parseDocument(file.ext, await this.folder.bytes(file));
            doc = { id: file.path, title: file.path, text, version: file.version };
            this.parsed.set(file.id, doc);
          }
          return doc;
        } catch (error) {
          console.warn(`[rag] skipped ${file.path}:`, error instanceof Error ? error.message : error);
          return null;
        }
      }),
    );
    return docs.filter((d): d is SourceDocument => d !== null);
  }
}
