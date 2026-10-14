import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createServerSupabase } from "../supabase/server";
import { getClientWithScans } from "../db";
import { isValidSessionValue, SESSION_COOKIE } from "../session";
import { draftGuide, type GuideContent } from "./summary";
import { sameOrigin } from "./security";

export interface GuideReport {
  id: string; client_id: string; scan_id: string; previous_scan_id: string | null;
  draft_content: GuideContent; published_content: GuideContent | null;
  approved_at: string | null; revision: number; updated_at: string;
  notification_status: "pending" | "sending" | "sent" | "failed";
}
export class GuideError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function requireGuideEnabled() {
  if (process.env.SOLAE_GUIDE_ENABLED !== "true") throw new GuideError(503, "Solae Guide is not enabled yet.");
}
export async function requireStudio(request?: Request) {
  requireGuideEnabled();
  const secret = process.env.SESSION_SECRET;
  if (!secret || !process.env.APP_PASSWORD || !await isValidSessionValue((await cookies()).get(SESSION_COOKIE)?.value, secret))
    throw new GuideError(401, "Studio sign-in required.");
  if (request && !sameOrigin(request)) throw new GuideError(403, "Please submit this action from the app.");
}
export async function portalAuth() {
  requireGuideEnabled();
  const jar = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new GuideError(503, "Client sign-in is not configured yet.");
  return createServerClient(url, key, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => { try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Server components rely on proxy for refresh. */ } },
    },
  });
}
export async function requirePortalClient() {
  const auth = await portalAuth();
  // This verifies the token with Supabase; cookie contents alone are never trusted.
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) throw new GuideError(401, "Please sign in to see your summaries.");
  const { data, error: dbError } = await createServerSupabase().from("guide_access")
    .select("client_id,email").eq("auth_user_id", user.id).maybeSingle();
  if (dbError) throw dbError;
  if (!data) throw new GuideError(403, "Angela has not enabled client access for this account.");
  return data as { client_id: string; email: string };
}
export async function ensureGuideDraft(clientId: string, scanId: string) {
  requireGuideEnabled();
  const result = await getClientWithScans(clientId);
  const index = result?.scans.findIndex(s => s.id === scanId) ?? -1;
  if (!result || index < 0) throw new GuideError(404, "Scan not found.");
  const scan = result.scans[index];
  const previous = result.scans[index - 1];
  const content = draftGuide(scan.parsed_data, previous?.parsed_data);
  const { error } = await createServerSupabase().from("guide_reports").upsert({
    client_id: clientId, scan_id: scanId, previous_scan_id: previous?.id ?? null,
    draft_content: content,
  }, { onConflict: "scan_id", ignoreDuplicates: true });
  if (error) throw error;
}
export async function approvedReports(clientId: string, reportId?: string) {
  let query = createServerSupabase().from("guide_reports")
    .select("id,published_content,approved_at").eq("client_id", clientId)
    .not("published_content", "is", null).order("approved_at", { ascending: false });
  if (reportId) query = query.eq("id", reportId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as { id: string; published_content: GuideContent; approved_at: string }[];
}
export function guideResponseError(error: unknown): Response {
  if (error instanceof GuideError) return Response.json({ error: error.message }, { status: error.status });
  // Never put scan data, email addresses, or raw database errors into responses/logs.
  return Response.json({ error: "Solae Guide could not complete this action. Check its setup and try again." }, { status: 500 });
}
