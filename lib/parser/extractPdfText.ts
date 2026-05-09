// Server-only PDF text extraction using unpdf (serverless-friendly).
//
// We bypass unpdf's `extractText` because it collapses the entire document
// into a single line. The parser in parseScan.ts expects per-row text shape
// (one marker per line, headers on their own line) — the same shape pdf-parse
// produced. We reconstruct lines from the underlying PDF.js text items by
// grouping items that share a y-position on the same page.
import "server-only";
import { getDocumentProxy } from "unpdf";

interface PdfTextItem {
  str: string;
  transform: number[];
  hasEOL?: boolean;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const allLines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items as PdfTextItem[];

    let currentY: number | null = null;
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
