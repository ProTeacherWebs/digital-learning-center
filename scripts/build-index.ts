import { buildIndex } from "../src/lib/rag";

async function main() {
  const count = await buildIndex();
  console.log(`[rag] ready: ${count} chunks in .rag-index.json`);
}

main();
