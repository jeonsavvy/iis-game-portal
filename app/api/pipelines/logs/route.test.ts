import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/admin-guard", () => ({
  withAdminGuard: vi.fn(),
}));

import { withAdminGuard } from "@/lib/api/admin-guard";
import { GET } from "./route";

const mockedWithAdminGuard = vi.mocked(withAdminGuard);

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

function makeResolved(data: unknown[] | null, errorMessage: string | null): Promise<QueryResult> {
  return Promise.resolve({
    data,
    error: errorMessage ? { message: errorMessage } : null,
  });
}

function buildSupabaseMock({
  logsData,
  logsError,
  adminData,
  adminError,
}: {
  logsData: unknown[] | null;
  logsError?: string | null;
  adminData: unknown[] | null;
  adminError?: string | null;
}) {
  const logsResolved = makeResolved(logsData, logsError ?? null);
  const adminResolved = makeResolved(adminData, adminError ?? null);

  const logsQuery = {
    eq: vi.fn().mockReturnValue(logsResolved),
    then: logsResolved.then.bind(logsResolved),
  };
  const logsEq = logsQuery.eq;
  const logsLimit = vi.fn().mockReturnValue(logsQuery);
  const logsOrder = vi.fn().mockReturnValue({ limit: logsLimit });
  const logsSelect = vi.fn().mockReturnValue({ order: logsOrder });

  const adminQuery = {
    eq: vi.fn().mockReturnValue(adminResolved),
    then: adminResolved.then.bind(adminResolved),
  };
  const adminEq = adminQuery.eq;
  const adminLimit = vi.fn().mockReturnValue(adminQuery);
  const adminOrder = vi.fn().mockReturnValue({ limit: adminLimit });
  const adminSelect = vi.fn().mockReturnValue({ order: adminOrder });

  const from = vi.fn((table: string) => {
    if (table === "pipeline_logs") return { select: logsSelect };
    if (table === "admin_config") return { select: adminSelect };
    throw new Error(`unexpected table: ${table}`);
  });

  return {
    supabase: { from },
    logsEq,
    logsLimit,
    adminEq,
    adminLimit,
  };
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
    const { supabase } = buildSupabaseMock({
      logsData: null,
      logsError: "db down",
      adminData: [],
    });
    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase,
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs?pipelineId=pid-1"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: "pipeline_logs_query_failed",
      detail: "db down",
    });
  });

  it("returns 500 when admin queue query fails", async () => {
    const { supabase } = buildSupabaseMock({
      logsData: [{ id: 1, pipeline_id: "pid-1" }],
      adminData: null,
      adminError: "admin table down",
    });
    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase,
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: "pipeline_queue_query_failed",
      detail: "admin table down",
    });
  });

  it("returns logs payload and applies pipeline filter", async () => {
    const { supabase, logsEq, logsLimit, adminEq, adminLimit } = buildSupabaseMock({
      logsData: [{ id: 1, pipeline_id: "pid-2", stage: "build", status: "running", agent_name: "developer", message: "m", reason: null, attempt: 1, metadata: {}, created_at: "2026-03-01T00:00:00Z" }],
      adminData: [{ id: "pid-2", keyword: "k", trigger_source: "console", payload: {}, status: "running", error_reason: null, created_at: "2026-03-01T00:00:00Z", updated_at: "2026-03-01T00:00:00Z" }],
    });
    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase,
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs?pipelineId=pid-2&limit=500"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      logs: [{ pipeline_id: "pid-2" }],
    });
    expect(logsLimit).toHaveBeenCalledWith(120);
    expect(logsEq).toHaveBeenCalledWith("pipeline_id", "pid-2");
    expect(adminLimit).toHaveBeenCalledWith(120);
    expect(adminEq).toHaveBeenCalledWith("id", "pid-2");
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("returns unsanitized metadata when raw=1 is provided", async () => {
    const longMessage = `build-${"x".repeat(500)}`;
    const manyReasons = Array.from({ length: 12 }, (_, index) => `reason_${index + 1}`);
    const { supabase } = buildSupabaseMock({
      logsData: [
        {
          id: 1,
          pipeline_id: "pid-raw",
          stage: "build",
          status: "error",
          agent_name: "developer",
          message: longMessage,
          reason: "builder_quality_floor_unmet",
          attempt: 1,
          metadata: {
            blocking_reasons: manyReasons,
          },
          created_at: "2026-03-01T00:00:00Z",
        },
      ],
      adminData: [
        {
          id: "pid-raw",
          keyword: "k",
          trigger_source: "console",
          payload: {},
          status: "error",
          error_reason: "builder_quality_floor_unmet",
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ],
    });
    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase,
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs?pipelineId=pid-raw&raw=1"));
    expect(response.status).toBe(200);

    const payload = await response.json();
    const first = payload.logs[0];
    expect(first.message).toBe(longMessage);
    expect(first.metadata.blocking_reasons).toHaveLength(12);
  });

  it("adds synthetic queued logs when pipeline logs are missing", async () => {
    const { supabase } = buildSupabaseMock({
      logsData: [],
      adminData: [
        {
          id: "pid-queued",
          keyword: "fps game",
          trigger_source: "telegram",
          payload: {},
          status: "queued",
          error_reason: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:01Z",
        },
      ],
    });
    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase,
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      logs: [
        {
          pipeline_id: "pid-queued",
          stage: "analyze",
          status: "queued",
          agent_name: "analyzer",
        },
      ],
    });
  });

  it("clamps limit to 1 when limit is zero", async () => {
    const { supabase, logsLimit, adminLimit } = buildSupabaseMock({
      logsData: [{ id: "log-1", pipeline_id: "pid-1" }],
      adminData: [],
    });
    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase,
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs?limit=0"));

    expect(response.status).toBe(200);
    expect(logsLimit).toHaveBeenCalledWith(1);
    expect(adminLimit).toHaveBeenCalledWith(1);
  });

  it("uses default limit when query value is invalid", async () => {
    const { supabase, logsLimit, adminLimit } = buildSupabaseMock({
      logsData: [{ id: "log-1", pipeline_id: "pid-1" }],
      adminData: [],
    });
    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase,
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/logs?limit=abc"));

    expect(response.status).toBe(200);
    expect(logsLimit).toHaveBeenCalledWith(80);
    expect(adminLimit).toHaveBeenCalledWith(80);
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
