import { NextResponse } from "next/server";
import { portalAuth, GuideError, guideResponseError } from "@/lib/guide/server";
import { sameOrigin } from "@/lib/guide/security";
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new GuideError(403, "Use the app to sign out.");
    const auth = await portalAuth();
    await auth.auth.signOut();
    return NextResponse.redirect(new URL("/portal/login", request.url), 303);
  } catch (error) { return guideResponseError(error); }
}
