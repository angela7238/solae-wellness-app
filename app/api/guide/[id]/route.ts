import { createServerSupabase } from "@/lib/supabase/server";
import { requireStudio, GuideError, guideResponseError } from "@/lib/guide/server";
import { notifyGuideReady } from "@/lib/guide/email";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStudio(request);
    const { id } = await context.params;
    const body = await request.json();
    const db = createServerSupabase();
    if (body.action === "notify") { await notifyGuideReady(id); return Response.json({ ok: true }); }
    if (!Number.isInteger(body.revision)) throw new GuideError(400, "Refresh the draft before editing.");
    if (body.action === "approve") {
      if (body.numbersChecked !== true || body.voiceChecked !== true) throw new GuideError(400, "Confirm the numbers and wording before release.");
      const { data: report } = await db.from("guide_reports").select("client_id").eq("id", id).maybeSingle();
      if (!report) throw new GuideError(404, "Summary not found.");
      const { data: access, error: accessError } = await db.from("guide_access").select("client_id").eq("client_id", report.client_id).maybeSingle();
      if (accessError) throw accessError;
      if (!access) throw new GuideError(409, "Enable private client access before release.");
      const { data, error } = await db.rpc("publish_guide_report", { p_id: id, p_revision: body.revision });
      if (error) throw error;
      if (!data) throw new GuideError(409, "This draft changed. Refresh before approving.");
      try { await notifyGuideReady(id); return Response.json({ ok: true, notification: "sent" }); }
      catch (error) { return Response.json({ ok: true, warning: error instanceof GuideError ? error.message : "Summary approved; ready email is pending." }); }
    }
    if (body.action !== "save" || typeof body.text !== "string" || !body.text.trim() || body.text.length > 15000 || typeof body.focus !== "string" || body.focus.length > 2000)
      throw new GuideError(400, "Provide a summary and a short focus.");
    const { data: row, error } = await db.from("guide_reports").select("draft_content").eq("id", id).eq("revision", body.revision).maybeSingle();
    if (error) throw error;
    if (!row) throw new GuideError(409, "This draft changed. Refresh before saving.");
    const { data: updated, error: updateError } = await db.from("guide_reports").update({
      draft_content: { ...row.draft_content, text: body.text.trim(), focus: body.focus.trim() },
      revision: body.revision + 1, updated_at: new Date().toISOString(),
    }).eq("id", id).eq("revision", body.revision).select("id").maybeSingle();
    if (updateError) throw updateError;
    if (!updated) throw new GuideError(409, "This draft changed. Refresh before saving.");
    return Response.json({ ok: true });
  } catch (error) { return guideResponseError(error); }
}
