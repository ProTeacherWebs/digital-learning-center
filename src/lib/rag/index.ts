import { promises as fs } from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { LocalFolderSource, type DocumentSource } from "./source";

const EMBEDDING_MODEL = "gemini-embedding-001";
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;
const EMBED_BATCH = 50;
const INDEX_FILE = path.join(process.cwd(), ".rag-index.json");

type Chunk = { source: string; title: string; text: string; vector: number[] };
type StoredIndex = { versions: Record<string, string>; chunks: Chunk[] };

export type Hit = { source: string; title: string; text: string; score: number };

/** The knowledge source. Swap for a Google Drive source here once it exists. */
const source: DocumentSource = new LocalFolderSource(
  path.join(process.cwd(), "knowledge"),
);

let client: GoogleGenAI | null = null;
function gemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY не задан");
  return (client ??= new GoogleGenAI({ apiKey }));
}

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    if (end < clean.length) {
      const breakAt = Math.max(
        clean.lastIndexOf("\n\n", end),
        clean.lastIndexOf(". ", end),
      );
      if (breakAt > start + CHUNK_SIZE / 2) end = breakAt + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

async function embed(texts: string[], taskType: string): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const res = await gemini().models.embedContent({
      model: EMBEDDING_MODEL,
      contents: texts.slice(i, i + EMBED_BATCH),
      config: { taskType },
    });
    for (const e of res.embeddings ?? []) vectors.push(e.values ?? []);
  }
  return vectors;
}

async function loadStored(): Promise<StoredIndex> {
  try {
    return JSON.parse(await fs.readFile(INDEX_FILE, "utf8"));
  } catch {
    return { versions: {}, chunks: [] };
  }
}

/** Re-embeds only documents whose version changed, drops documents that disappeared. */
async function sync(): Promise<StoredIndex> {
  const docs = await source.list();
  const stored = await loadStored();

  const current = new Map(docs.map((d) => [d.id, d]));
  const unchanged = (id: string) =>
    current.get(id)?.version === stored.versions[id];

  const kept = stored.chunks.filter((c) => unchanged(c.source));
  const fresh = docs.filter((d) => !unchanged(d.id));
  if (fresh.length === 0 && kept.length === stored.chunks.length) return stored;

  const pending = fresh.flatMap((d) =>
    chunkText(d.text).map((text) => ({ source: d.id, title: d.title, text })),
  );
  const vectors = pending.length
    ? await embed(
        pending.map((p) => p.text),
        "RETRIEVAL_DOCUMENT",
      )
    : [];

  const next: StoredIndex = {
    versions: Object.fromEntries(docs.map((d) => [d.id, d.version])),
    chunks: [...kept, ...pending.map((p, i) => ({ ...p, vector: vectors[i] }))],
  };
  await fs.writeFile(INDEX_FILE, JSON.stringify(next));
  return next;
}

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export async function search(query: string, topK = 5): Promise<Hit[]> {
  const index = await sync();
  if (index.chunks.length === 0) return [];
  const [queryVector] = await embed([query], "RETRIEVAL_QUERY");
  return index.chunks
    .map((c) => ({
      source: c.source,
      title: c.title,
      text: c.text,
      score: cosine(queryVector, c.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
