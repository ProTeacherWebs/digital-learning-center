import { promises as fs } from "node:fs";
import path from "node:path";

export type SourceDocument = {
  /** Stable id of the document inside its source (relative path, Drive file id, ...). */
  id: string;
  /** Name shown to the visitor as the answer's source. */
  title: string;
  text: string;
  /** Changes whenever the content changes; used to skip re-indexing. */
  version: string;
};

/** Anything that can list documents as plain text. Google Drive plugs in here later. */
export interface DocumentSource {
  readonly name: string;
  list(): Promise<SourceDocument[]>;
}

const TEXT_EXTENSIONS = new Set([".md", ".txt"]);

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

async function readPdf(file: string): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: await fs.readFile(file) });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}

async function readDocx(file: string): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  return (await mammoth.extractRawText({ path: file })).value;
}

/** One line per row, "column: value", so a retrieved chunk stays readable without its header row. */
async function readXlsx(file: string): Promise<string> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
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
  return lines.join("\n");
}

const BINARY_READERS: Record<string, (file: string) => Promise<string>> = {
  ".pdf": readPdf,
  ".docx": readDocx,
  ".xlsx": readXlsx,
};

export class LocalFolderSource implements DocumentSource {
  readonly name = "local-folder";

  constructor(private readonly root: string) {}

  async list(): Promise<SourceDocument[]> {
    const docs: SourceDocument[] = [];
    for await (const file of walk(this.root)) {
      const ext = path.extname(file).toLowerCase();
      const isText = TEXT_EXTENSIONS.has(ext);
      const readBinary = BINARY_READERS[ext];
      if (!isText && !readBinary) continue;
      if (path.basename(file).toLowerCase() === "readme.md") continue;

      const stat = await fs.stat(file);
      const text = isText ? await fs.readFile(file, "utf8") : await readBinary(file);
      const id = path.relative(this.root, file).split(path.sep).join("/");
      docs.push({
        id,
        title: id,
        text,
        version: `${stat.mtimeMs}-${stat.size}`,
      });
    }
    return docs;
  }
}
