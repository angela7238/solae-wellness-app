import { NextResponse } from "next/server";
import { getSupplementEvaluations, deleteSupplementEvaluation } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const evaluations = await getSupplementEvaluations(id);
    return NextResponse.json({ evaluations });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { evaluationId } = (await req.json()) as { evaluationId: string };
    await deleteSupplementEvaluation(evaluationId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
