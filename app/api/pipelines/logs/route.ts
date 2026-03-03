import { NextResponse } from "next/server";

import { runAdminReadRoute } from "@/lib/api/admin-read-route";
import { jsonError } from "@/lib/api/error-response";
import { sanitizePipelineLog } from "@/lib/pipeline/log-sanitizer";
import type { Database } from "@/types/database";
import type { PipelineLog } from "@/types/pipeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" } as const;

function createSyntheticLog(row: Database["public"]["Tables"]["admin_config"]["Row"]): PipelineLog {
  const payload = row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {};
  const pipelineVersion = typeof payload.pipeline_version === "string" ? payload.pipeline_version.trim() : "";
  return {
    pipeline_id: row.id,
    stage: "analyze",
    status: row.status,
    agent_name: "analyzer",
    message: row.status === "queued" ? `큐 등록됨: ${row.keyword}` : `파이프라인 상태: ${row.status}`,
    reason: row.error_reason,
    attempt: 1,
    metadata: {
      synthetic: true,
      source: row.trigger_source,
      keyword: row.keyword,
      ...(pipelineVersion ? { pipeline_version: pipelineVersion } : {}),
    },
    created_at: row.updated_at || row.created_at,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pipelineId = url.searchParams.get("pipelineId")?.trim() || null;
  const limitParam = Number(url.searchParams.get("limit") ?? "80");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 120) : 80;

  return runAdminReadRoute(
    async (auth) => {
      let query = auth.supabase
        .from("pipeline_logs")
        .select("id,pipeline_id,stage,status,agent_name,message,reason,attempt,metadata,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (pipelineId) {
        query = query.eq("pipeline_id", pipelineId);
      }

      const { data, error } = await query;
      if (error) {
        return jsonError({
          status: 500,
          error: "Failed to fetch pipeline logs",
          detail: error.message,
          code: "pipeline_logs_query_failed",
          headers: NO_STORE_HEADERS,
        });
      }

      let adminQuery = auth.supabase
        .from("admin_config")
        .select("id,keyword,trigger_source,status,error_reason,created_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (pipelineId) {
        adminQuery = adminQuery.eq("id", pipelineId);
      }

      const { data: adminRows, error: adminError } = await adminQuery;
      if (adminError) {
        return jsonError({
          status: 500,
          error: "Failed to fetch pipeline queue",
          detail: adminError.message,
          code: "pipeline_queue_query_failed",
          headers: NO_STORE_HEADERS,
        });
      }

      const typedLogs = ((data ?? []) as PipelineLog[]).map(sanitizePipelineLog);
      const typedAdminRows = (adminRows ?? []) as Database["public"]["Tables"]["admin_config"]["Row"][];
      const existingPipelineIds = new Set(typedLogs.map((row) => row.pipeline_id));
      const syntheticLogs = typedAdminRows.filter((row) => !existingPipelineIds.has(row.id)).map((row) => sanitizePipelineLog(createSyntheticLog(row)));
      const mergedLogs = [...typedLogs, ...syntheticLogs]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit);

      return NextResponse.json(
        { logs: mergedLogs },
        { headers: NO_STORE_HEADERS },
      );
    },
    { errorHeaders: NO_STORE_HEADERS },
  );
}
