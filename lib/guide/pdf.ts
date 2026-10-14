import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { GuideContent } from "./summary";

export async function guidePdf(content: GuideContent) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const titleFont = await pdf.embedFont(StandardFonts.TimesRoman);
  let page = pdf.addPage([612, 792]); let y = 740;
  // Standard PDF fonts need WinAnsi. Preserve common punctuation; substitute
  // unsupported glyphs rather than failing an otherwise valid download.
  const printable = (text: string) => text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
  function line(text: string, title = false) {
    if (y < 54) { page = pdf.addPage([612, 792]); y = 740; }
    page.drawText(printable(text), { x: 48, y, size: title ? 18 : 10, font: title ? titleFont : font, color: rgb(.094, .086, .071) });
    y -= title ? 28 : 16;
  }
  function paragraph(text: string) {
    for (const block of text.split("\n")) {
      let row = "";
      for (const word of printable(block).split(/\s+/)) {
        if (font.widthOfTextAtSize(row ? row + " " + word : word, 10) > 510 && row) { line(row); row = ""; }
        // Split long unbroken strings too.
        let rest = word;
        while (font.widthOfTextAtSize(rest, 10) > 510) { let cut = rest.length; while (font.widthOfTextAtSize(rest.slice(0, cut), 10) > 510) cut--; if (row) { line(row); row = ""; } line(rest.slice(0, cut)); rest = rest.slice(cut); }
        row = row ? row + " " + rest : rest;
      }
      if (row) line(row);
      y -= 6;
    }
  }
  line("SOLAE | Solae Guide", true);
  line("Reviewed by Angela | Scan " + content.scanDate);
  if (content.previousDate) line("Compared with " + content.previousDate);
  y -= 12; paragraph(content.text);
  if (content.focus) { y -= 8; line("Our agreed focus", true); paragraph(content.focus); }
  y -= 8; line("Your system graphs", true);
  paragraph("Gold: current scan. Gray: previous scan. Percentages count markers in the scanner's reference ranges, not organ function.");
  for (const s of content.systems) {
    if (y < 120) { page = pdf.addPage([612, 792]); y = 740; }
    paragraph(s.name + ": " + s.current + "% (" + s.inRange + " of " + s.total + " in range)" + (s.previous !== null ? "; previous " + s.previous + "%" : "; no comparable prior data"));
    page.drawRectangle({ x: 48, y: y - 4, width: 510, height: 6, color: rgb(.94, .93, .9) });
    page.drawRectangle({ x: 48, y: y - 4, width: 510 * s.current / 100, height: 6, color: rgb(.79, .69, .51) }); y -= 14;
    if (s.previous !== null) { page.drawRectangle({ x: 48, y: y - 4, width: 510, height: 6, color: rgb(.94, .93, .9) }); page.drawRectangle({ x: 48, y: y - 4, width: 510 * s.previous / 100, height: 6, color: rgb(.59, .56, .51) }); y -= 14; }
    y -= 8;
  }
  if (content.warnings.length) { line("Comparison notes", true); content.warnings.forEach(paragraph); }
  paragraph("Wellness-tracking information, not diagnostic laboratory results. Product choices and next steps remain a conversation with Angela.");
  for (const [index, p] of pdf.getPages().entries()) p.drawText(String(index + 1) + " / " + pdf.getPageCount(), { x: 520, y: 25, size: 9, font });
  return pdf.save();
}
