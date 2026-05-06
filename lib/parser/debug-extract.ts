import fs from "node:fs";
import { PDFParse } from "pdf-parse";

async function main() {
  const buffer = fs.readFileSync(
    "C:/Users/angel/OneDrive/Wellness Scan Co/Angela 12 3 2025.pdf",
  );
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();

  const text = result.text;
  const lines = text.split(/\r?\n/);

  // Find line index of "(Liver Function) Analysis Report Card"
  const idx = lines.findIndex((l) =>
    /^\(Liver Function\) Analysis Report Card$/.test(l),
  );
  console.log(`Liver section starts at line ${idx}`);
  for (let i = idx; i < idx + 30; i++) {
    console.log(i, JSON.stringify(lines[i]));
  }

  console.log("\n--- All section header lines (one-line format) ---");
  const oneLine = lines.filter((l) => /^\(.+\) Analysis Report Card$/.test(l));
  console.log(`Count: ${oneLine.length}`);
  oneLine.slice(0, 5).forEach((l) => console.log(JSON.stringify(l)));

  console.log("\n--- Two-line format header lines ---");
  let two = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    if (
      /^\(.+\)\s*$/.test(lines[i]) &&
      /^Analysis Report Card\s*$/.test(lines[i + 1])
    ) {
      two++;
    }
  }
  console.log(`Count: ${two}`);
}

main();
