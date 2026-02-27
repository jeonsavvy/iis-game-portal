import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/admin-guard", () => ({
  withAdminGuard: vi.fn(),
}));

import { withAdminGuard } from "@/lib/api/admin-guard";
import { GET } from "./route";

const mockedWithAdminGuard = vi.mocked(withAdminGuard);

function createLogsQueryResult(data: unknown[] | null, errorMessage: string | null) {
  const resolved = Promise.resolve({
    data,
    error: errorMessage ? { message: errorMessage } : null,
  });

  const query = {
    eq: vi.fn().mockReturnValue(resolved),
    then: resolved.then.bind(resolved),
  };

  const limit = vi.fn().mockReturnValue(query);
  const order = vi.fn().mockReturnValue({ limit });
  const select = vi.fn().mockReturnValue({ order });
  const from = vi.fn().mockReturnValue({ select });

  return { from, query, limit, select, order };
}

describe("GET /api/pipelines/logs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("passes through admin guard failures", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce(
      NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 }) as never,
    );

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs"));

    expect(response.status).toBe(403);
    expect(mockedWithAdminGuard).toHaveBeenCalledWith("pipeline:read", {
      errorHeaders: { "Cache-Control": "no-store, max-age=0" },
    });
  });

  it("returns 500 when supabase logs query fails", async () => {
    const { from } = createLogsQueryResult(null, "db down");
    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase: { from },
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs?pipelineId=pid-1"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: "pipeline_logs_query_failed",
      detail: "db down",
    });
  });

  it("returns logs payload and applies pipeline filter", async () => {
    const { from, query, limit } = createLogsQueryResult([{ id: "log-1" }], null);
    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase: { from },
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs?pipelineId=pid-2&limit=500"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ logs: [{ id: "log-1" }] });
    expect(limit).toHaveBeenCalledWith(300);
    expect(query.eq).toHaveBeenCalledWith("pipeline_id", "pid-2");
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("clamps limit to 1 when limit is zero", async () => {
    const { from, limit } = createLogsQueryResult([{ id: "log-1" }], null);
    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase: { from },
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs?limit=0"));

    expect(response.status).toBe(200);
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("uses default limit when query value is invalid", async () => {
    const { from, limit } = createLogsQueryResult([{ id: "log-1" }], null);
    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase: { from },
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs?limit=abc"));

    expect(response.status).toBe(200);
    expect(limit).toHaveBeenCalledWith(180);
  });

  it("returns normalized 502 when unexpected exception occurs", async () => {
    mockedWithAdminGuard.mockRejectedValueOnce(new Error("supabase client bootstrap failed"));

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs?pipelineId=pid-2"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Core engine unavailable",
      detail: "supabase client bootstrap failed",
      code: "core_engine_unavailable",
    });
  });
});
