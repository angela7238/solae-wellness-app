import "server-only";
import { createServerSupabase } from "../supabase/server";
import { GuideError } from "./server";

export function appOrigin() {
  const raw = process.env.SOLAE_APP_URL;
  if (!raw) throw new GuideError(503, "Set SOLAE_APP_URL before sending client email.");
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new GuideError(503, "The app URL must use HTTPS.");
  return url.origin;
}

/** Resend is an adapter choice for the first implementation, not yet provisioned.
 * Claims avoid concurrent duplicate sends; provider idempotency handles retries. */
export async function notifyGuideReady(reportId: string) {
  const db = createServerSupabase();
  const { data: report, error } = await db.from("guide_reports")
    .select("client_id,approved_at,notification_status,notification_claimed_at")
    .eq("id", reportId).not("published_content", "is", null).maybeSingle();
  if (error) throw error;
  if (!report) throw new GuideError(404, "Approved summary not found.");
  if (report.notification_status === "sent") return "sent";
  const { data: access, error: accessError } = await db.from("guide_access").select("email").eq("client_id", report.client_id).maybeSingle();
  if (accessError) throw accessError;
  if (!access) throw new GuideError(409, "Enable this client's access before sending a notification.");
  const key = process.env.RESEND_API_KEY;
  const from = process.env.SOLAE_EMAIL_FROM;
  if (!key || !from) throw new GuideError(503, "Summary approved. Ready emails need an email provider configured.");
  const origin = appOrigin();
  if (report.notification_status === "sending" && report.notification_claimed_at && Date.now() - Date.parse(report.notification_claimed_at) < 120_000)
    throw new GuideError(409, "A notification is already being sent.");
  const { data: claimed, error: claimError } = await db.from("guide_reports")
    .update({ notification_status: "sending", notification_claimed_at: new Date().toISOString() })
    .eq("id", reportId).eq("approved_at", report.approved_at).eq("notification_status", report.notification_status).select("id").maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) throw new GuideError(409, "Summary changed. Refresh before sending.");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "Idempotency-Key": "guide-" + reportId + "-" + report.approved_at },
      body: JSON.stringify({ from, to: [access.email], subject: "Your Solae summary is ready",
        text: "Your summary is ready. Sign in to your private Solae page to read it and download a PDF.\n\n" + origin + "/portal/login\n\nWarmly,\nSolae" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error("Email provider rejected delivery.");
    const { error: updateError } = await db.from("guide_reports").update({ notification_status: "sent" }).eq("id", reportId).eq("approved_at", report.approved_at);
    if (updateError) throw updateError;
    return "sent";
  } catch {
    await db.from("guide_reports").update({ notification_status: "failed" }).eq("id", reportId).eq("approved_at", report.approved_at);
    throw new GuideError(502, "Summary approved, but the email was not confirmed. You can retry the notification.");
  }
}
