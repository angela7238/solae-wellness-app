import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getDocumentProxy } from "unpdf";

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

// Use tsx so we can import the TS parser directly.
const { parseScan } = await import(
  pathToFileURL(path.resolve("lib/parser/parseScan.ts")).href
);

const pdfPath = process.argv[2];
const buffer = fs.readFileSync(pdfPath);
const text = await extractPdfText(buffer);
const parsed = parseScan(text);

console.log(`Client: ${parsed.client.name} | Age: ${parsed.client.age} | Sex: ${parsed.client.sex}`);
console.log(`Scan date: ${parsed.scanDate} (${parsed.scanDateLocale})`);
console.log(`Systems found: ${parsed.systems.length}`);
console.log(`Total markers: ${parsed.totalMarkers} | In range: ${parsed.markersInRange}`);
console.log("\nFirst 5 systems:");
parsed.systems.slice(0, 5).forEach((s) => {
  console.log(`  ${s.name} — ${s.markers.length} markers, ${s.percentNormal}% normal (${s.status})`);
});
