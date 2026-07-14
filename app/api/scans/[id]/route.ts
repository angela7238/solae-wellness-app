import { NextResponse } from "next/server";
import {
  updateScanNotes,
  updateScanCoachNotes,
  updateScanProductsGiven,
} from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      notes?: string;
      coach_notes?: string;
      products_given?: string[];
    };

    if (typeof body.notes === "string") {
      await updateScanNotes(id, body.notes);
    } else if (typeof body.coach_notes === "string") {
      await updateScanCoachNotes(id, body.coach_notes);
    } else if (Array.isArray(body.products_given)) {
      await updateScanProductsGiven(
        id,
        body.products_given.filter((p): p is string => typeof p === "string"),
      );
    } else {
      return NextResponse.json(
        { error: "notes, coach_notes, or products_given required" },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
