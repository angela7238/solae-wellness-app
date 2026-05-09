import fs from "node:fs";
import { getDocumentProxy } from "unpdf";

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: node scripts/diag-unpdf.mjs <pdf-path>");
  process.exit(1);
}

// Inline copy of the new extractPdfText so we test the exact code that ships.
async function extractPdfText(buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const allLines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items;
    let currentY = null;
    let currentLine = "";
    for (const item of items) {
      if (typeof item.str !== "string") continue;
      const y = Math.round(item.transform[5]);
      if (currentY === null) {
        currentY = y;
        currentLine = item.str;
      } else if (y === currentY) {
        currentLine += item.str;
      } else {
        allLines.push(currentLine);
        currentY = y;
        currentLine = item.str;
      }
    }
    if (currentLine) allLines.push(currentLine);
  }
  return allLines.join("\n");
}

const buffer = fs.readFileSync(pdfPath);
const text = await extractPdfText(buffer);
const lines = text.split(/\r?\n/);

console.log(`Total chars: ${text.length}`);
console.log(`Total lines: ${lines.length}\n`);

console.log("--- First 25 lines ---");
lines.slice(0, 25).forEach((l, i) => console.log(i, JSON.stringify(l)));

console.log("\n--- Single-line header matches /^\\((.+?)\\)\\s+Analysis Report Card\\s*$/ ---");
let single = 0;
const headers = [];
lines.forEach((l, i) => {
  const m = l.match(/^\((.+?)\)\s+Analysis Report Card\s*$/);
  if (m) {
    single++;
    headers.push({ line: i, system: m[1] });
  }
});
console.log(`Matches: ${single}`);
headers.slice(0, 10).forEach((h) => console.log(`  line ${h.line}: ${h.system}`));

console.log("\n--- Two-line header matches ('(Name)' then 'Analysis Report Card') ---");
let two = 0;
for (let i = 0; i < lines.length - 1; i++) {
  if (/^\(.+\)\s*$/.test(lines[i]) && /^Analysis Report Card\s*$/.test(lines[i + 1])) {
    two++;
  }
}
console.log(`Matches: ${two}`);
