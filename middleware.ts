// Route protection.
//
// Every route is private by default. Nothing renders and no API route answers
// without a valid session cookie. Fails CLOSED: if APP_PASSWORD or
// SESSION_SECRET is missing, the whole app is locked rather than left open.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionValue } from "@/lib/session";

/** Reachable without a session. Everything else requires sign-in. */
const PUBLIC_PATHS = ["/login", "/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.SESSION_SECRET;
  const password = process.env.APP_PASSWORD;

  // An unconfigured deploy is locked, never wide open.
  if (!secret || !password) {
    return NextResponse.json(
      {
        error:
          "Sign-in is not configured. Set APP_PASSWORD and SESSION_SECRET in the site environment variables.",
      },
      { status: 503 },
    );
  }

  const signedIn = await isValidSessionValue(
    request.cookies.get(SESSION_COOKIE)?.value,
    secret,
  );

  if (!signedIn && !isPublic(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  if (signedIn && pathname === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next's static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
