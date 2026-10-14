import { createServerSupabase } from "@/lib/supabase/server";
import { requireStudio, ensureGuideDraft, GuideError, guideResponseError } from "@/lib/guide/server";

export async function GET() {
  try {
    await requireStudio();
    const db = createServerSupabase();
    const [reports, clients, access] = await Promise.all([
      db.from("guide_reports").select("*").order("updated_at", { ascending: false }),
      db.from("clients").select("id,name,email").order("name"),
      db.from("guide_access").select("client_id,email"),
    ]);
    if (reports.error || clients.error || access.error) throw new Error("Database unavailable.");
    return Response.json({ reports: reports.data, clients: clients.data, access: access.data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return guideResponseError(error); }
}
export async function POST(request: Request) {
  try {
    await requireStudio(request);
    const { clientId } = await request.json();
    if (typeof clientId !== "string") throw new GuideError(400, "Choose a client.");
    const { data: scans, error } = await createServerSupabase().from("scans").select("id").eq("client_id", clientId).order("scan_date");
    if (error) throw error;
    if (!scans?.length) throw new GuideError(404, "This client has no scans.");
    for (const scan of scans) await ensureGuideDraft(clientId, scan.id);
    return Response.json({ ok: true });
  } catch (error) { return guideResponseError(error); }
}
