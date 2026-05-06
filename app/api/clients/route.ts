import { NextResponse } from "next/server";
import { listClientsWithScanCounts } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const clients = await listClientsWithScanCounts();
    return NextResponse.json({ clients });
  } catch (err) {
    console.error("clients GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
