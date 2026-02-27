import { describe, expect, it } from "vitest";

import { coreEngineUnavailableError, jsonError, normalizeCoreErrorPayload } from "./error-response";

describe("normalizeCoreErrorPayload", () => {
  it("normalizes nested error payload with code", () => {
    const normalized = normalizeCoreErrorPayload(
      {
        detail: { reason: "pipeline_conflict" },
      },
      "Conflict",
    );

    expect(normalized).toEqual({
      error: "pipeline_conflict",
      detail: { reason: "pipeline_conflict" },
      code: "pipeline_conflict",
    });
  });

  it("falls back to status text when payload is empty", () => {
    expect(normalizeCoreErrorPayload(undefined, "Gateway Timeout")).toEqual({
      error: "Gateway Timeout",
    });
  });

  it("sanitizes empty status text fallback", () => {
    expect(normalizeCoreErrorPayload(undefined, "   ")).toEqual({
      error: "Core engine request failed",
    });
  });

  it("does not expose malformed code values", () => {
    const normalized = normalizeCoreErrorPayload(
      {
        error: "rate limit",
        code: "<script>alert(1)</script>",
        detail: { retry_after: 1 },
      },
      "Too Many Requests",
    );

    expect(normalized).toEqual({
      error: "rate limit",
      detail: { retry_after: 1 },
    });
  });
});

describe("jsonError", () => {
  it("returns standardized API error shape", async () => {
    const response = jsonError({
      status: 409,
      error: "Already running",
      code: "pipeline_conflict",
      detail: { pipeline_id: "abc" },
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Already running",
      code: "pipeline_conflict",
      detail: { pipeline_id: "abc" },
    });
  });

  it("sanitizes malformed code and empty error", async () => {
    const response = jsonError({
      status: 500,
      error: "   ",
      code: "<bad>",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unknown error",
    });
  });
});

describe("coreEngineUnavailableError", () => {
  it("normalizes Error instances to shared unavailable payload", async () => {
    const response = coreEngineUnavailableError(new Error("connect timeout"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Core engine unavailable",
      detail: "connect timeout",
      code: "core_engine_unavailable",
    });
  });

  it("preserves caller-provided headers", async () => {
    const response = coreEngineUnavailableError(new Error("connect timeout"), { "Cache-Control": "no-store" });

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
