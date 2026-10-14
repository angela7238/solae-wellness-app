import { createServerSupabase } from "@/lib/supabase/server";
import { requireStudio, GuideError, guideResponseError } from "@/lib/guide/server";

export async function POST(request: Request) {
  try {
    await requireStudio(request);
    const { clientId, email, confirmedInPerson, confirmedEmail } = await request.json();
    if (confirmedInPerson !== true || confirmedEmail !== true) throw new GuideError(400, "Confirm the in-person visit and client email first.");
    if (typeof clientId !== "string" || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      throw new GuideError(400, "Choose a client and their verified email address.");
    const db = createServerSupabase();
    const { data: client, error } = await db.from("clients").select("id").eq("id", clientId).maybeSingle();
    if (error) throw error;
    if (!client) throw new GuideError(404, "Client not found.");
    const normalized = email.trim().toLowerCase();
    const { error: createError } = await db.auth.admin.createUser({ email: normalized, email_confirm: true });
    if (createError && createError.code !== "email_exists") throw createError;
    const { error: enrollError } = await db.rpc("enroll_guide_client", { p_client_id: clientId, p_email: normalized });
    if (enrollError) throw new GuideError(409, "Access could not be linked. This email may already belong to another client.");
    return Response.json({ ok: true });
  } catch (error) { return guideResponseError(error); }
}
export async function DELETE(request: Request) {
  try {
    await requireStudio(request);
    const { clientId } = await request.json();
    if (typeof clientId !== "string") throw new GuideError(400, "Choose a client.");
    const { error } = await createServerSupabase().from("guide_access").delete().eq("client_id", clientId);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) { return guideResponseError(error); }
}
