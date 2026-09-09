// Single shared studio login.
//
// One password, one session cookie. No accounts database, no extra packages —
// deliberately small so it is easy to audit.
//
// The cookie holds an expiry timestamp plus an HMAC of that timestamp signed
// with SESSION_SECRET. Without the secret a cookie cannot be forged, and
// changing the secret invalidates every session at once.
//
// Uses Web Crypto so the same code runs in middleware (Edge) and in route
// handlers (Node).

export const SESSION_COOKIE = "studio_session";

/** How long a sign-in lasts. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return toBase64Url(signature);
}

/** Length-safe, content-constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Mint a signed cookie value. */
export async function createSessionValue(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  return `${payload}.${await hmac(secret, payload)}`;
}

/** True only for an unexpired cookie whose signature matches. */
export async function isValidSessionValue(
  value: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!value) return false;

  const separator = value.lastIndexOf(".");
  if (separator < 1) return false;

  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  return safeEqual(signature, await hmac(secret, payload));
}

/** Verify a submitted password without leaking length through timing. */
export async function passwordMatches(
  submitted: string,
  expected: string,
  secret: string,
): Promise<boolean> {
  // Compare hashes rather than the raw strings so both sides are fixed-length.
  const [a, b] = await Promise.all([
    hmac(secret, submitted),
    hmac(secret, expected),
  ]);
  return safeEqual(a, b);
}
