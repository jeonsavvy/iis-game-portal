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

describe("POST /api/pipelines/control", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 for invalid action", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    const request = new Request("https://portal.example.com/api/pipelines/control", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://portal.example.com" },
      body: JSON.stringify({ pipelineId: "pid-1", action: "invalid" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockedWithAdminGuard).toHaveBeenCalledWith("pipeline:write", { request });
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_action",
    });
    expect(mockedForwardToCoreEngine).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is invalid json", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/control", {
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

  it("forwards valid control action", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedForwardToCoreEngine.mockResolvedValueOnce(NextResponse.json({ ok: true }, { status: 200 }));

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/control", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ pipelineId: "pid-2", action: "pause" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedForwardToCoreEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/v1/pipelines/pid-2/controls",
        method: "POST",
        retries: 1,
        body: { action: "pause" },
      }),
    );
  });

  it("returns normalized 502 when proxy call throws", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedForwardToCoreEngine.mockRejectedValueOnce(new Error("upstream unavailable"));

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/control", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ pipelineId: "pid-2", action: "pause" }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Core engine unavailable",
      detail: "upstream unavailable",
      code: "core_engine_unavailable",
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
      new Request("https://portal.example.com/api/pipelines/control", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ pipelineId: "pid-missing", action: "pause" }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Pipeline not found",
      detail: "Pipeline not found",
    });
  });

  it("passes through core conflict response", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedForwardToCoreEngine.mockResolvedValueOnce(
      NextResponse.json(
        {
          error: "pause_status_not_allowed",
          detail: "pause_status_not_allowed",
          code: "pause_status_not_allowed",
        },
        { status: 409 },
      ),
    );

    const response = await POST(
      new Request("https://portal.example.com/api/pipelines/control", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ pipelineId: "pid-2", action: "pause" }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "pause_status_not_allowed",
      detail: "pause_status_not_allowed",
      code: "pause_status_not_allowed",
    });
  });
});
