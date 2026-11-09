import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { knowledge } from "../knowledge";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;
const EMBED_BATCH = 50;
const INDEX_FILE = path.join(process.cwd(), ".rag-index.json");

type Chunk = {
  source: string;
  title: string;
  text: string;
  vector: number[];
};
type PendingChunk = Omit<Chunk, "vector">;

export type Hit = { source: string; title: string; text: string; score: number };
export type SearchResult = { hits: Hit[]; indexing: boolean };

let client: GoogleGenAI | null = null;
function gemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY не задан");
  return (client ??= new GoogleGenAI({ apiKey }));
}

/** Chunks of about CHUNK_SIZE characters; a form feed in the text is a hard boundary. */
export function chunkText(text: string): string[] {
  return text.split("\f").flatMap((segment) => {
    const chunks = chunkSegment(segment);
    // A section's heading names its subject; repeat it so no chunk loses track of what it is about.
    const heading = /^# .+/.exec(segment.trim())?.[0];
    return heading ? chunks.map((c) => (c.startsWith(heading) ? c : `${heading}\n${c}`)) : chunks;
  });
}

function chunkSegment(segment: string): string[] {
  const clean = segment.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    if (end < clean.length) {
      const breakAt = Math.max(
        clean.lastIndexOf("\n\n", end),
        clean.lastIndexOf("\n", end),
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The free tier allows ~100 embedded texts a minute; on a 429 wait the time Gemini asks for. */
async function embed(texts: string[], taskType: string, maxRetries = 30): Promise<number[][]> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await gemini().models.embedContent({
        model: EMBEDDING_MODEL,
        contents: texts,
        config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
      });
      return (res.embeddings ?? []).map((e) => e.values ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const rateLimited = /\b429\b|RESOURCE_EXHAUSTED/.test(message);
      if (!rateLimited || attempt >= maxRetries) throw error;
      const asked = Number(/retry in ([\d.]+)s/i.exec(message)?.[1]);
      await sleep((Number.isFinite(asked) ? Math.ceil(asked) + 2 : 60) * 1000);
    }
  }
}

async function loadStored(): Promise<Chunk[]> {
  try {
    return JSON.parse(await fs.readFile(INDEX_FILE, "utf8"));
  } catch {
    return [];
  }
}

const save = (chunks: Chunk[]) => fs.writeFile(INDEX_FILE, JSON.stringify(chunks));
/** A chunk is identified by its text, so an edited document only re-embeds the chunks that changed. */
const keyOf = (c: PendingChunk) =>
  `${c.source}|${createHash("sha1").update(c.text).digest("hex")}`;

let current: Chunk[] | null = null;
let job: Promise<void> | null = null;

/** Compares the source with the stored index and embeds what is missing, saving after every batch. */
async function reconcile() {
  const docs = await knowledge().source.list();
  const wanted: PendingChunk[] = docs.flatMap((d) =>
    chunkText(d.text).map((text) => ({ source: d.id, title: d.title, text })),
  );
  const wantedKeys = new Set(wanted.map(keyOf));
  const stored = current ?? (await loadStored());
  const kept = stored.filter((c) => wantedKeys.has(keyOf(c)));
  const have = new Set(kept.map(keyOf));
  const pending = wanted.filter((w) => !have.has(keyOf(w)));

  current = kept;
  if (kept.length !== stored.length) await save(kept);
  if (pending.length === 0) return 0;

  job = (async () => {
    for (let at = 0; at < pending.length; at += EMBED_BATCH) {
      const batch = pending.slice(at, at + EMBED_BATCH);
      const vectors = await embed(
        batch.map((b) => b.text),
        "RETRIEVAL_DOCUMENT",
      );
      current = [...(current ?? []), ...batch.map((b, n) => ({ ...b, vector: vectors[n] }))];
      await save(current);
      console.log(`[rag] indexed ${Math.min(at + EMBED_BATCH, pending.length)}/${pending.length}`);
    }
  })()
    .catch((error) => console.error("[rag] indexing failed", error))
    .finally(() => {
      job = null;
    });
  return pending.length;
}

/**
 * Picks up added, edited and removed documents on every call. A small change is embedded before
 * answering, so new text is searchable at once; a large one continues in the background.
 */
async function refresh() {
  if (job) return;
  const pending = await reconcile();
  if (pending <= EMBED_BATCH) await job;
}

/** Builds the whole index and waits for it; used by `npm run index`. */
export async function buildIndex() {
  await refresh();
  await job;
  return current?.length ?? 0;
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

/** Searches what is indexed so far; new or changed documents are embedded in the background. */
export async function search(query: string, topK = 5): Promise<SearchResult> {
  await refresh();
  const chunks = current ?? [];
  if (chunks.length === 0) return { hits: [], indexing: job !== null };
  const [queryVector] = await embed([query], "RETRIEVAL_QUERY", 3);
  const hits = chunks
    .map((c) => ({
      source: c.source,
      title: c.title,
      text: c.text,
      score: cosine(queryVector, c.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return { hits, indexing: job !== null };
}
