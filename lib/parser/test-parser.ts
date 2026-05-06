// One-off CLI test script for the parser. Run with:
//   npx tsx lib/parser/test-parser.ts <path-to-pdf>
// Not part of the app build.

import fs from "node:fs";
import path from "node:path";
// Use PDFParse directly here (extractPdfText.ts has "server-only" guard for Next.js)
import { PDFParse } from "pdf-parse";
import { parseScan } from "./parseScan";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function main() {
  const inputPath =
    process.argv[2] ||
    "C:/Users/angel/OneDrive/Wellness Scan Co/Angela 12 3 2025.pdf";
  console.log(`Parsing: ${path.basename(inputPath)}`);

  const buffer = fs.readFileSync(inputPath);
  const text = await extractPdfText(buffer);
  console.log(`  Extracted ${text.length} chars of text`);

  const parsed = parseScan(text);

  console.log(`\nClient: ${parsed.client.name} (age ${parsed.client.age})`);
  console.log(`Scan date: ${parsed.scanDateLocale} → ${parsed.scanDate}`);
  console.log(
    `Systems parsed: ${parsed.systems.length} / 41 expected`,
  );
  console.log(
    `Total markers: ${parsed.totalMarkers} (${parsed.markersInRange} in range)`,
  );

  console.log("\nPer-system summary:");
  for (const sys of parsed.systems) {
    const dot =
      sys.status === "green"
        ? "🟢"
        : sys.status === "blue"
          ? "🔵"
          : sys.status === "yellow"
            ? "🟡"
            : "🔴";
    console.log(
      `  ${dot} ${sys.name.padEnd(40)} ${sys.percentNormal.toFixed(1).padStart(5)}%  (${sys.markers.length} markers)`,
    );
  }

  // Sanity check: list any expected systems that didn't get parsed
  const found = new Set(parsed.systems.map((s) => s.name));
  const expected = [
    "Allergy",
    "Cardiovascular and Cerebrovascular",
    "Liver Function",
    "Kidney Function",
    "Brain Nerve",
  ];
  const missing = expected.filter((s) => !found.has(s));
  if (missing.length) {
    console.log(`\n⚠️  Missing expected systems: ${missing.join(", ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
