import { NextResponse } from "next/server";
import { updateScanNotes } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { notes?: string };
    if (typeof body.notes !== "string") {
      return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
    }
    await updateScanNotes(id, body.notes);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
