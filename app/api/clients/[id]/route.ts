import { NextResponse } from "next/server";
import {
  getClientWithScans,
  deleteClient,
  updateClientWellnessProfile,
} from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      wellness_profile?: {
        eating: string;
        hormonal: string;
        exercise: string;
      } | null;
    };
    if ("wellness_profile" in body) {
      await updateClientWellnessProfile(id, body.wellness_profile ?? null);
    } else {
      return NextResponse.json(
        { error: "wellness_profile required" },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("client PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const result = await getClientWithScans(id);
    if (!result) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("client GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    await deleteClient(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("client DELETE error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
