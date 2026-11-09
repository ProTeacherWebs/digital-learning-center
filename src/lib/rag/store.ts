import { promises as fs } from "node:fs";
import path from "node:path";
import { get, put } from "@vercel/blob";

export type IndexChunk = {
  source: string;
  title: string;
  text: string;
  vector: number[];
};

export type LoadedIndex = { chunks: IndexChunk[]; tag: string };

/** Where the index lives between requests, so it survives restarts and is shared by instances. */
export interface IndexStore {
  /** The stored index, "unchanged" when `knownTag` is still current, or null when nothing is stored yet. */
  load(knownTag?: string): Promise<LoadedIndex | "unchanged" | null>;
  save(chunks: IndexChunk[]): Promise<string | undefined>;
}

const INDEX_FILE = path.join(process.cwd(), ".rag-index.json");

const fileStore: IndexStore = {
  async load(knownTag) {
    try {
      const stat = await fs.stat(INDEX_FILE);
      const tag = `${stat.mtimeMs}-${stat.size}`;
      if (tag === knownTag) return "unchanged";
      return { chunks: JSON.parse(await fs.readFile(INDEX_FILE, "utf8")), tag };
    } catch {
      return null;
    }
  },
  async save(chunks) {
    await fs.writeFile(INDEX_FILE, JSON.stringify(chunks));
    const stat = await fs.stat(INDEX_FILE);
    return `${stat.mtimeMs}-${stat.size}`;
  },
};

const BLOB_PATH = "rag-index.json";
/** Must match how the Blob store was created in Vercel (Private is recommended). */
const blobAccess = () => (process.env.BLOB_ACCESS === "public" ? "public" : "private");

const blobStore: IndexStore = {
  async load(knownTag) {
    const res = await get(BLOB_PATH, { access: blobAccess(), useCache: false, ifNoneMatch: knownTag });
    if (!res) return null;
    if (res.statusCode === 304) return "unchanged";
    return { chunks: JSON.parse(await new Response(res.stream).text()), tag: res.blob.etag };
  },
  async save(chunks) {
    const res = await put(BLOB_PATH, JSON.stringify(chunks), {
      access: blobAccess(),
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return (res as { etag?: string }).etag;
  },
};

/**
 * Vercel's file system is read-only and short-lived, so there the index goes to Blob.
 * Locally it is a file; `RAG_INDEX_STORE=blob` (used by `npm run index:blob`) writes the Blob from a laptop.
 */
export function indexStore(): IndexStore {
  const useBlob = process.env.RAG_INDEX_STORE
    ? process.env.RAG_INDEX_STORE === "blob"
    : Boolean(process.env.VERCEL);
  return useBlob ? blobStore : fileStore;
}
