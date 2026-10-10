import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/parser/extractPdfText";
import { parseScan } from "@/lib/parser/parseScan";
import {
  createClient,
  findClientByName,
  fillMissingDemographics,
  saveScan,
  getClientWithScans,
} from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No PDF file provided (expected field 'pdf')" },
        { status: 400 },
      );
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractPdfText(buffer);
    const parsed = parseScan(text);

    if (parsed.systems.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not parse any systems from this PDF. The format may differ from the standard Wellness Scan Co Test Report.",
          textPreview: text.slice(0, 500),
        },
        { status: 422 },
      );
    }
    if (!parsed.scanDate) {
      return NextResponse.json(
        { error: "Could not extract scan date from this PDF." },
        { status: 422 },
      );
    }

    // Find or create client by name
    let clientRow = await findClientByName(parsed.client.name);
    let clientCreated = false;
    if (!clientRow) {
      clientRow = await createClient({
        name: parsed.client.name,
        age: parsed.client.age || null,
        sex: parsed.client.sex ?? null,
      });
      clientCreated = true;
    } else {
      clientRow = await fillMissingDemographics(clientRow, parsed.client);
    }

    // Save the scan (upsert by client + date — re-uploading is safe)
    const scanRow = await saveScan({
      clientId: clientRow.id,
      scanDate: parsed.scanDate,
      parsedData: parsed,
    });

    // Look up the client's full scan list so the UI can show "scan #X of Y"
    // and route directly to the multi-scan compare view.
    const withScans = await getClientWithScans(clientRow.id);
    const totalScans = withScans?.scans.length ?? 1;
    const scanNumber =
      (withScans?.scans
        .slice()
        .sort((a, b) => a.scan_date.localeCompare(b.scan_date))
        .findIndex((s) => s.id === scanRow.id) ?? 0) + 1;

    return NextResponse.json({
      ...parsed,
      _meta: {
        clientId: clientRow.id,
        clientCreated,
        scanId: scanRow.id,
        scanNumber,
        totalScans,
      },
    });
  } catch (err) {
    console.error("parse-scan error:", err);
    return NextResponse.json(
      {
        error: "Failed to parse or save PDF",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
