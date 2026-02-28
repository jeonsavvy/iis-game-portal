import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/admin-guard", () => ({
  withAdminGuard: vi.fn(),
}));

vi.mock("@/lib/api/core-engine-proxy", () => ({
  forwardToCoreEngine: vi.fn(),
}));

vi.mock("@/lib/text/trigger-keyword", () => ({
  sanitizeTriggerKeyword: vi.fn((value: string) => value),
}));

import { withAdminGuard } from "@/lib/api/admin-guard";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { sanitizeTriggerKeyword } from "@/lib/text/trigger-keyword";
import { POST } from "./route";

const mockedWithAdminGuard = vi.mocked(withAdminGuard);
const mockedForwardToCoreEngine = vi.mocked(forwardToCoreEngine);
const mockedSanitizeTriggerKeyword = vi.mocked(sanitizeTriggerKeyword);

describe("POST /api/pipelines/trigger", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("passes through auth failures", async () => {
    const request = new Request("https://portal.example.com/api/pipelines/trigger", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://portal.example.com" },
      body: JSON.stringify({ keyword: "neon" }),
    });
    mockedWithAdminGuard.mockResolvedValueOnce(
      NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 }) as never,
    );

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockedWithAdminGuard).toHaveBeenCalledWith("pipeline:write", { request });
    expect(mockedForwardToCoreEngine).not.toHaveBeenCalled();
  });

  it("returns 400 when keyword is empty after sanitize", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedSanitizeTriggerKeyword.mockReturnValueOnce("");

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/trigger", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ keyword: "   " }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "keyword is required",
      code: "invalid_keyword",
    });
    expect(mockedForwardToCoreEngine).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is invalid json", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/trigger", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: '{"keyword"',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_json_body",
    });
    expect(mockedForwardToCoreEngine).not.toHaveBeenCalled();
  });

  it("forwards request with idempotency key", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedSanitizeTriggerKeyword.mockReturnValueOnce("neon drift");
    mockedForwardToCoreEngine.mockResolvedValueOnce(NextResponse.json({ ok: true }, { status: 201 }));

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/trigger", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://portal.example.com",
          "Idempotency-Key": "idem-123",
        },
        body: JSON.stringify({
          keyword: "  neon drift  ",
          execution_mode: "manual",
          pipeline_version: "forgeflow-v2",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mockedForwardToCoreEngine).toHaveBeenCalledTimes(1);
    expect(mockedForwardToCoreEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/v1/pipelines/trigger",
        method: "POST",
        retries: 3,
        headers: { "Idempotency-Key": "idem-123" },
        body: expect.objectContaining({
          keyword: "neon drift",
          source: "console",
          requested_by: "user-1",
          execution_mode: "auto",
          pipeline_version: "forgeflow-v2",
          idempotency_key: "idem-123",
        }),
      }),
    );
  });

  it("generates idempotency key when header is missing", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedSanitizeTriggerKeyword.mockReturnValueOnce("neon drift");
    mockedForwardToCoreEngine.mockResolvedValueOnce(NextResponse.json({ ok: true }, { status: 201 }));
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-generated-001" } as Crypto);

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/trigger", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://portal.example.com",
        },
        body: JSON.stringify({
          keyword: "  neon drift  ",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mockedForwardToCoreEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { "Idempotency-Key": "uuid-generated-001" },
        body: expect.objectContaining({
          idempotency_key: "uuid-generated-001",
        }),
      }),
    );
    vi.unstubAllGlobals();
  });

  it("returns normalized 502 when proxy call throws", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedSanitizeTriggerKeyword.mockReturnValueOnce("neon drift");
    mockedForwardToCoreEngine.mockRejectedValueOnce(new Error("connect timeout"));

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/trigger", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://portal.example.com",
        },
        body: JSON.stringify({
          keyword: "neon drift",
          execution_mode: "manual",
        }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Core engine unavailable",
      detail: "connect timeout",
      code: "core_engine_unavailable",
    });
  });

  it("passes through normalized core conflict payload", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedSanitizeTriggerKeyword.mockReturnValueOnce("neon drift");
    mockedForwardToCoreEngine.mockResolvedValueOnce(
      NextResponse.json(
        {
          error: "pipeline_conflict",
          detail: { reason: "pipeline_conflict" },
          code: "pipeline_conflict",
        },
        { status: 409 },
      ),
    );

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/trigger", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://portal.example.com",
        },
        body: JSON.stringify({
          keyword: "neon drift",
          execution_mode: "manual",
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "pipeline_conflict",
      detail: { reason: "pipeline_conflict" },
      code: "pipeline_conflict",
    });
  });
});
