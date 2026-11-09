import { promises as fs } from "node:fs";
import path from "node:path";
import { DriveFolder, GoogleDriveSource } from "./rag/drive";
import { LocalFolderSource, type DocumentSource } from "./rag/source";

export type KnowledgeFile = { buffer: Buffer; version: string };

/** Where the documents live: the assistant reads all of them, the catalog reads single files. */
export type Knowledge = {
  source: DocumentSource;
  /** A file by its name in the knowledge folder, or null when it is not there. */
  file(name: string): Promise<KnowledgeFile | null>;
};

function local(): Knowledge {
  const dir = path.join(process.cwd(), "knowledge");
  return {
    source: new LocalFolderSource(dir),
    async file(name) {
      try {
        const file = path.join(dir, name);
        const stat = await fs.stat(file);
        return { buffer: await fs.readFile(file), version: `${stat.mtimeMs}-${stat.size}` };
      } catch {
        return null;
      }
    },
  };
}

function drive(): Knowledge {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!folderId || (!keyFile && !json)) {
    throw new Error(
      "KNOWLEDGE_SOURCE=drive требует GOOGLE_DRIVE_FOLDER_ID и GOOGLE_SERVICE_ACCOUNT_FILE (или GOOGLE_SERVICE_ACCOUNT_JSON)",
    );
  }
  const folder = new DriveFolder(folderId, { keyFile, json });
  return { source: new GoogleDriveSource(folder), file: (name) => folder.file(name) };
}

let instance: Knowledge | null = null;

/** The configured knowledge store: the local `knowledge/` folder, or a Google Drive folder. */
export function knowledge(): Knowledge {
  return (instance ??= process.env.KNOWLEDGE_SOURCE === "drive" ? drive() : local());
}
