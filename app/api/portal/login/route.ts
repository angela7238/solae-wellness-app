import { createServerSupabase } from "@/lib/supabase/server";
import { portalAuth, GuideError, guideResponseError } from "@/lib/guide/server";
import { sameOrigin } from "@/lib/guide/security";
import { appOrigin } from "@/lib/guide/email";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new GuideError(403, "Open the sign-in page to request a link.");
    const auth = await portalAuth();
    const { email } = await request.json();
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new GuideError(400, "Enter your email address.");
    const normalized = email.trim().toLowerCase();
    const { data: access, error } = await createServerSupabase().from("guide_access").select("client_id").eq("email", normalized).maybeSingle();
    if (error) throw error;
    if (access) {
      const { error: authError } = await auth.auth.signInWithOtp({ email: normalized, options: { shouldCreateUser: false, emailRedirectTo: appOrigin() + "/portal/callback" } });
      if (authError) {
        if (authError.status === 429) throw new GuideError(429, "Please wait before requesting another link.");
        throw new GuideError(503, "Sign-in email is unavailable. Please contact Solae.");
      }
    }
    return Response.json({ message: "If Angela has enabled access for this email, a sign-in link will arrive shortly. Open it in this browser." });
  } catch (error) { return guideResponseError(error); }
}
