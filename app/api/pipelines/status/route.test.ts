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
import { GET } from "./route";

const mockedWithAdminGuard = vi.mocked(withAdminGuard);
const mockedForwardToCoreEngine = vi.mocked(forwardToCoreEngine);

describe("GET /api/pipelines/status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 when pipelineId query is missing", async () => {
    const response = await GET(new Request("https://portal.example.com/api/pipelines/status"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_pipeline_id",
    });
    expect(mockedWithAdminGuard).not.toHaveBeenCalled();
  });

  it("passes through admin guard failures", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce(
      NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 }) as never,
    );

    const response = await GET(new Request("https://portal.example.com/api/pipelines/status?pipelineId=pid-1"));

    expect(response.status).toBe(401);
    expect(mockedWithAdminGuard).toHaveBeenCalledWith("pipeline:read", {
      errorHeaders: { "Cache-Control": "no-store, max-age=0" },
    });
    expect(mockedForwardToCoreEngine).not.toHaveBeenCalled();
  });

  it("forwards valid status request with no-store headers", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedForwardToCoreEngine.mockResolvedValueOnce(NextResponse.json({ status: "queued" }, { status: 200 }));

    const response = await GET(new Request("https://portal.example.com/api/pipelines/status?pipelineId=pid-2"));

    expect(response.status).toBe(200);
    expect(mockedForwardToCoreEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/v1/pipelines/pid-2",
        method: "GET",
        retries: 3,
        responseHeaders: { "Cache-Control": "no-store, max-age=0" },
      }),
    );
  });

  it("returns normalized 502 when status proxy throws", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedForwardToCoreEngine.mockRejectedValueOnce(new Error("status fetch timeout"));

    const response = await GET(new Request("https://portal.example.com/api/pipelines/status?pipelineId=pid-2"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Core engine unavailable",
      detail: "status fetch timeout",
      code: "core_engine_unavailable",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("passes through not-found payload from core engine", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "user-1", role: "master_admin", supabase: {} } as never);
    mockedForwardToCoreEngine.mockResolvedValueOnce(
      NextResponse.json(
        {
          error: "Pipeline not found",
          detail: "Pipeline not found",
        },
        { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } },
      ),
    );

    const response = await GET(new Request("https://portal.example.com/api/pipelines/status?pipelineId=pid-missing"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Pipeline not found",
      detail: "Pipeline not found",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });
});
