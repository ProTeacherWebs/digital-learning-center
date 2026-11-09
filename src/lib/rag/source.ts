import { promises as fs } from "node:fs";
import path from "node:path";

export type SourceDocument = {
  /** Stable id of the document inside its source (relative path, Drive path, ...). */
  id: string;
  /** Name of the document. */
  title: string;
  text: string;
  /** Changes whenever the content changes; used to skip re-indexing. */
  version: string;
};

/** Anything that can list documents as plain text. */
export interface DocumentSource {
  readonly name: string;
  list(): Promise<SourceDocument[]>;
}

const TEXT_EXTENSIONS = new Set([".md", ".txt"]);

async function readPdf(data: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}

/**
 * Plain text that keeps the headings: "# " for a top-level heading, "## " for the next level.
 * A top-level section (a course, a chapter) starts after a form feed, so the chunker never merges two of them.
 */
async function readDocx(buffer: Buffer): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const { value } = await mammoth.convertToHtml({ buffer });
  return value
    .replace(/<h1[^>]*>/g, "\f# ")
    .replace(/<h2[^>]*>/g, "\n## ")
    .replace(/<li[^>]*>/g, "- ")
    .replace(/<\/(p|h\d|li|tr)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

/**
 * One entry per row, "column: value", so a retrieved chunk stays readable without its header row.
 * Rows are separated by a form feed, which the chunker never merges across: one row, one chunk.
 */
async function readXlsx(data: Buffer): Promise<string> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data as unknown as ArrayBuffer);
  const lines: string[] = [];
  workbook.eachSheet((sheet) => {
    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => (headers[col] = cell.text));
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cells: string[] = [];
      row.eachCell((cell, col) => {
        if (cell.text) cells.push(`${headers[col] ?? `Колонка ${col}`}: ${cell.text}`);
      });
      if (cells.length) lines.push(`Лист «${sheet.name}». ${cells.join("; ")}`);
    });
  });
  return lines.join("\f");
}

const BINARY_READERS: Record<string, (data: Buffer) => Promise<string>> = {
  ".pdf": readPdf,
  ".docx": readDocx,
  ".xlsx": readXlsx,
};

/** Whether a file with this extension can be read as a document. */
export const isReadable = (ext: string) => TEXT_EXTENSIONS.has(ext) || ext in BINARY_READERS;

/** Skipped everywhere: README, hidden files and the lock files Word and Excel keep next to an open document. */
export const isIgnoredName = (name: string) =>
  name.toLowerCase() === "readme.md" || name.startsWith("~$") || name.startsWith(".");

/** Plain text of a document, from its bytes and the extension of its name (".docx", ".txt", ...). */
export async function parseDocument(ext: string, data: Buffer): Promise<string> {
  return TEXT_EXTENSIONS.has(ext) ? data.toString("utf8") : BINARY_READERS[ext](data);
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

export class LocalFolderSource implements DocumentSource {
  readonly name = "local-folder";

  /** Parsed files by path, so an unchanged file costs one stat() per call instead of a re-parse. */
  private readonly parsed = new Map<string, SourceDocument>();

  constructor(private readonly root: string) {}

  async list(): Promise<SourceDocument[]> {
    const docs: SourceDocument[] = [];
    for await (const file of walk(this.root)) {
      const name = path.basename(file);
      const ext = path.extname(file).toLowerCase();
      if (!isReadable(ext) || isIgnoredName(name)) continue;

      try {
        const stat = await fs.stat(file);
        const version = `${stat.mtimeMs}-${stat.size}`;
        let doc = this.parsed.get(file);
        if (doc?.version !== version) {
          const text = await parseDocument(ext, await fs.readFile(file));
          const id = path.relative(this.root, file).split(path.sep).join("/");
          doc = { id, title: id, text, version };
          this.parsed.set(file, doc);
        }
        docs.push(doc);
      } catch (error) {
        // A file caught mid-save is picked up on the next call.
        console.warn(`[rag] skipped ${name}:`, error instanceof Error ? error.message : error);
      }
    }
    return docs;
  }
}
