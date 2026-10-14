import { NextResponse } from "next/server";
import { portalAuth, requirePortalClient } from "@/lib/guide/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  try {
    if (code) {
      const auth = await portalAuth();
      const { error } = await auth.auth.exchangeCodeForSession(code);
      if (!error) {
        try { await requirePortalClient(); }
        catch { await auth.auth.signOut(); throw new Error("Access unavailable."); }
        return NextResponse.redirect(new URL("/portal", url.origin));
      }
    }
  } catch { /* Generic expired-link message, no token or email in logs. */ }
  return NextResponse.redirect(new URL("/portal/login?expired=1", url.origin));
}
