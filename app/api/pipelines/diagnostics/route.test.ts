import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/admin-guard", () => ({
  withAdminGuard: vi.fn(),
}));

import { withAdminGuard } from "@/lib/api/admin-guard";
import { GET } from "./route";

const mockedWithAdminGuard = vi.mocked(withAdminGuard);

type QueryResult<T = unknown> = Promise<{ data: T[] | null; error: { message: string } | null }>;

function resolved<T>(data: T[] | null, errorMessage?: string): QueryResult<T> {
  return Promise.resolve({
    data,
    error: errorMessage ? { message: errorMessage } : null,
  });
}

function buildSupabaseMock(options: {
  queueRecent: QueryResult;
  logsRecent: QueryResult;
  queueById: QueryResult;
  logsByPipeline: QueryResult;
}) {
  const adminSelect = vi.fn((columns: string) => {
    if (columns === "id,updated_at,status,error_reason") {
      return {
        order: vi.fn(() => ({
          limit: vi.fn(() => options.queueRecent),
        })),
      };
    }

    if (columns === "id,status,error_reason,payload") {
      return {
        eq: vi.fn(() => ({
          limit: vi.fn(() => options.queueById),
        })),
      };
    }

    throw new Error(`unexpected admin select: ${columns}`);
  });

  const logsSelect = vi.fn((columns: string) => {
    if (columns === "pipeline_id,created_at") {
      return {
        order: vi.fn(() => ({
          limit: vi.fn(() => options.logsRecent),
        })),
      };
    }

    if (columns === "id,pipeline_id,stage,status,agent_name,message,reason,attempt,metadata,created_at") {
      return {
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => options.logsByPipeline),
          })),
        })),
      };
    }

    throw new Error(`unexpected logs select: ${columns}`);
  });

  const from = vi.fn((table: string) => {
    if (table === "admin_config") return { select: adminSelect };
    if (table === "pipeline_logs") return { select: logsSelect };
    throw new Error(`unexpected table: ${table}`);
  });

  return {
    supabase: { from },
    adminSelect,
    logsSelect,
  };
}

describe("GET /api/pipelines/diagnostics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 when pipelineRef is missing", async () => {
    const response = await GET(new Request("https://portal.example.com/api/pipelines/diagnostics"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "invalid_pipeline_ref" });
    expect(mockedWithAdminGuard).not.toHaveBeenCalled();
  });

  it("returns 401 when admin guard fails", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce(
      NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 }) as never,
    );

    const response = await GET(new Request("https://portal.example.com/api/pipelines/diagnostics?pipelineRef=bb06d86e-398"));

    expect(response.status).toBe(401);
  });

  it("resolves short pipeline ref and returns diagnostics", async () => {
    const { supabase } = buildSupabaseMock({
      queueRecent: resolved([{ id: "bb06d86e-398f-4f13-9b9a-8c6ec98bd0fd", updated_at: "2026-03-04T10:00:00Z" }]),
      logsRecent: resolved([]),
      queueById: resolved([
        {
          id: "bb06d86e-398f-4f13-9b9a-8c6ec98bd0fd",
          status: "error",
          error_reason: "builder_quality_floor_unmet",
          payload: {},
        },
      ]),
      logsByPipeline: resolved([
        {
          id: 100,
          pipeline_id: "bb06d86e-398f-4f13-9b9a-8c6ec98bd0fd",
          stage: "build",
          status: "error",
          agent_name: "developer",
          message: "빌드 중단",
          reason: "builder_quality_floor_unmet",
          attempt: 1,
          metadata: {
            blocking_reasons: ["visual_gate_unmet", "visual_contrast"],
          },
          created_at: "2026-03-04T10:10:00Z",
        },
      ]),
    });

    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase,
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/diagnostics?pipelineRef=bb06d86e-398"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      resolved_pipeline_id: "bb06d86e-398f-4f13-9b9a-8c6ec98bd0fd",
      primary_failure_reason: "builder_quality_floor_unmet",
      secondary_reasons: expect.arrayContaining(["visual_gate_unmet"]),
    });
  });

  it("returns 409 when prefix is ambiguous", async () => {
    const { supabase } = buildSupabaseMock({
      queueRecent: resolved([
        { id: "bb06d86e-398f-4f13-9b9a-8c6ec98bd0fd", updated_at: "2026-03-04T10:00:00Z" },
        { id: "bb06d86e-398a-4f13-9b9a-8c6ec98bd0aa", updated_at: "2026-03-04T09:00:00Z" },
      ]),
      logsRecent: resolved([]),
      queueById: resolved([]),
      logsByPipeline: resolved([]),
    });

    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase,
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/diagnostics?pipelineRef=bb06d86e-398"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "pipeline_ref_ambiguous",
      detail: {
        candidates: expect.any(Array),
      },
    });
  });

  it("returns 404 when pipeline ref cannot be resolved", async () => {
    const { supabase } = buildSupabaseMock({
      queueRecent: resolved([]),
      logsRecent: resolved([]),
      queueById: resolved([]),
      logsByPipeline: resolved([]),
    });

    mockedWithAdminGuard.mockResolvedValueOnce({
      userId: "user-1",
      role: "master_admin",
      supabase,
    } as never);

    const response = await GET(new Request("https://portal.example.com/api/pipelines/diagnostics?pipelineRef=does-not-exist"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: "pipeline_not_found" });
  });
});
