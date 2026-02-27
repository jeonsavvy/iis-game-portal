import { NextResponse } from "next/server";

export const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" } as const;
export const ARTIFACT_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy":
    "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
} as const;

export function ensureNoStoreHeaders(response: NextResponse): NextResponse {
  if (!response.headers.has("Cache-Control")) {
    response.headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);
  }
  return response;
}

export function ensureArtifactSecurityHeaders(response: NextResponse): NextResponse {
  for (const [headerName, headerValue] of Object.entries(ARTIFACT_SECURITY_HEADERS)) {
    if (!response.headers.has(headerName)) {
      response.headers.set(headerName, headerValue);
    }
  }
  return response;
}
