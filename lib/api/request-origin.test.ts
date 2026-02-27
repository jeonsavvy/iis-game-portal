import { describe, expect, it } from "vitest";

import { validateTrustedWriteOrigin } from "./request-origin";

function buildRequest(origin: string | null, target = "https://portal.example.com/api/pipelines/trigger"): Request {
  const headers = new Headers();
  if (origin !== null) {
    headers.set("origin", origin);
  }
  return new Request(target, { method: "POST", headers });
}

describe("validateTrustedWriteOrigin", () => {
  it("accepts same-origin write requests", () => {
    const request = buildRequest("https://portal.example.com");
    expect(validateTrustedWriteOrigin(request)).toEqual({ ok: true });
  });

  it("rejects null origin", () => {
    const request = buildRequest("null");
    expect(validateTrustedWriteOrigin(request)).toEqual({ ok: false, code: "origin_null" });
  });

  it("rejects cross-origin host", () => {
    const request = buildRequest("https://evil.example.com");
    expect(validateTrustedWriteOrigin(request)).toEqual({ ok: false, code: "origin_mismatch" });
  });

  it("rejects missing origin", () => {
    const request = buildRequest(null);
    expect(validateTrustedWriteOrigin(request)).toEqual({ ok: false, code: "origin_missing" });
  });

  it("rejects malformed origin value", () => {
    const request = buildRequest("not-a-url");
    expect(validateTrustedWriteOrigin(request)).toEqual({ ok: false, code: "origin_invalid" });
  });
});
