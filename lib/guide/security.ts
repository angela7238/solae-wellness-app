export const isPortalPath = (path: string) => path === "/portal" || path.startsWith("/portal/") || path === "/api/portal" || path.startsWith("/api/portal/");

/** Cookie-authenticated mutations may only originate at the app itself. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export function portalOwnsReport(clientId: string, reportClientId: string, approved: boolean): boolean {
  return approved && clientId === reportClientId;
}
