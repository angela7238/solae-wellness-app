// POST /auth/login — check the shared studio password and set the session cookie.
//
// A plain HTML form posts here, so sign-in works even before any JavaScript
// loads. On success we redirect home; on failure back to /login with an error
// flag. A wrong password never sets a cookie.

import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionValue,
  passwordMatches,
} from "@/lib/session";

export async function POST(request: Request) {
  const secret = process.env.SESSION_SECRET;
  const password = process.env.APP_PASSWORD;

  // Fail closed: an unconfigured deploy cannot be signed into.
  if (!secret || !password) {
    return NextResponse.json(
      { error: "Sign-in is not configured." },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  const submitted = form?.get("password");

  const ok =
    typeof submitted === "string" &&
    submitted.length > 0 &&
    (await passwordMatches(submitted, password, secret));

  if (!ok) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(SESSION_COOKIE, await createSessionValue(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
