import { knowledge } from "../src/lib/knowledge";

async function main() {
  const docs = await knowledge().source.list();
  for (const d of docs) console.log(d.id, d.text.length, d.version);
  const sheet = await knowledge().file("proweb-ceny-i-prepodavateli.xlsx");
  console.log("xlsx:", sheet ? `${sheet.buffer.length} bytes` : "not found");
}

main().catch((e) => {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
