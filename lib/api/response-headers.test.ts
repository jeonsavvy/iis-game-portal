import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";

import { ARTIFACT_SECURITY_HEADERS, ensureArtifactSecurityHeaders, ensureNoStoreHeaders, NO_STORE_HEADERS } from "./response-headers";

describe("ensureNoStoreHeaders", () => {
  it("applies no-store when Cache-Control is missing", async () => {
    const response = NextResponse.json({ ok: true }, { status: 200 });

    const normalized = ensureNoStoreHeaders(response);

    expect(normalized.headers.get("Cache-Control")).toBe(NO_STORE_HEADERS["Cache-Control"]);
  });

  it("keeps existing Cache-Control value", async () => {
    const response = NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "public, max-age=60" } },
    );

    const normalized = ensureNoStoreHeaders(response);

    expect(normalized.headers.get("Cache-Control")).toBe("public, max-age=60");
  });
});

describe("ensureArtifactSecurityHeaders", () => {
  it("applies artifact security headers when missing", async () => {
    const response = new NextResponse("<html></html>", { status: 200 });

    const normalized = ensureArtifactSecurityHeaders(response);

    expect(normalized.headers.get("X-Content-Type-Options")).toBe(ARTIFACT_SECURITY_HEADERS["X-Content-Type-Options"]);
    expect(normalized.headers.get("X-Frame-Options")).toBe(ARTIFACT_SECURITY_HEADERS["X-Frame-Options"]);
    expect(normalized.headers.get("Referrer-Policy")).toBe(ARTIFACT_SECURITY_HEADERS["Referrer-Policy"]);
    expect(normalized.headers.get("Permissions-Policy")).toBe(ARTIFACT_SECURITY_HEADERS["Permissions-Policy"]);
  });

  it("keeps existing header values", async () => {
    const response = new NextResponse("<html></html>", {
      status: 200,
      headers: {
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin",
      },
    });

    const normalized = ensureArtifactSecurityHeaders(response);

    expect(normalized.headers.get("X-Frame-Options")).toBe("DENY");
    expect(normalized.headers.get("Referrer-Policy")).toBe("strict-origin");
    expect(normalized.headers.get("X-Content-Type-Options")).toBe(ARTIFACT_SECURITY_HEADERS["X-Content-Type-Options"]);
  });
});
