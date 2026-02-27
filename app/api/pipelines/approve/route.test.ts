import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/admin-guard", () => ({
  withAdminGuard: vi.fn(),
}));

vi.mock("@/lib/api/core-engine-proxy", () => ({
  forwardToCoreEngine: vi.fn(),
}));

import { withAdminGuard } from "@/lib/api/admin-guard";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { POST } from "./route";

const mockedWithAdminGuard = vi.mocked(withAdminGuard);
const mockedForwardToCoreEngine = vi.mocked(forwardToCoreEngine);

describe("POST /api/pipelines/approve", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("passes through auth failures", async () => {
    const request = new Request("https://portal.example.com/api/pipelines/approve", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://portal.example.com" },
      body: JSON.stringify({ pipelineId: "pid-1", stage: "qa" }),
    });
    mockedWithAdminGuard.mockResolvedValueOnce(
      NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 }) as never,
    );

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mockedWithAdminGuard).toHaveBeenCalledWith("pipeline:write", { request });
    expect(mockedForwardToCoreEngine).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid stage", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/approve", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ pipelineId: "pid-2", stage: "invalid" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_stage",
    });
    expect(mockedForwardToCoreEngine).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is invalid json", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/approve", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: '{"pipelineId"',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_json_body",
    });
    expect(mockedForwardToCoreEngine).not.toHaveBeenCalled();
  });

  it("forwards valid approval request", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedForwardToCoreEngine.mockResolvedValueOnce(NextResponse.json({ ok: true }, { status: 200 }));

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/approve", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ pipelineId: "pid-3", stage: "qa" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedForwardToCoreEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/v1/pipelines/pid-3/approvals",
        method: "POST",
        retries: 1,
        body: { stage: "qa" },
      }),
    );
  });

  it("returns normalized 502 when proxy call throws", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedForwardToCoreEngine.mockRejectedValueOnce(new Error("core api timeout"));

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/approve", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ pipelineId: "pid-3", stage: "qa" }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Core engine unavailable",
      detail: "core api timeout",
      code: "core_engine_unavailable",
    });
  });

  it("passes through core conflict response", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedForwardToCoreEngine.mockResolvedValueOnce(
      NextResponse.json(
        {
          error: "approval_conflict",
          detail: { stage: "qa", status: "already_approved" },
          code: "approval_conflict",
        },
        { status: 409 },
      ),
    );

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/approve", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ pipelineId: "pid-3", stage: "qa" }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "approval_conflict",
      detail: { stage: "qa", status: "already_approved" },
      code: "approval_conflict",
    });
  });

  it("passes through core not-found response", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedForwardToCoreEngine.mockResolvedValueOnce(
      NextResponse.json(
        {
          error: "Pipeline not found",
          detail: "Pipeline not found",
        },
        { status: 404 },
      ),
    );

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/approve", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ pipelineId: "pid-missing", stage: "qa" }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Pipeline not found",
      detail: "Pipeline not found",
    });
  });
});
