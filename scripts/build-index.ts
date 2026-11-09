import { buildIndex } from "../src/lib/rag";

async function main() {
  // --blob writes the index to Vercel Blob (needs BLOB_READ_WRITE_TOKEN) instead of a local file.
  if (process.argv.includes("--blob")) process.env.RAG_INDEX_STORE = "blob";
  const count = await buildIndex();
  console.log(`[rag] ready: ${count} chunks`);
}

main();
