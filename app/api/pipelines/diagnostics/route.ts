import { NextResponse } from "next/server";

import { runAdminReadRoute } from "@/lib/api/admin-read-route";
import { jsonError } from "@/lib/api/error-response";
import { applyFailureSnapshotFallback, buildPipelineDiagnostics } from "@/lib/pipeline/diagnostics";
import type { Database } from "@/types/database";
import type { PipelineLog, PipelineStatus } from "@/types/pipeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" } as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type QueueLookup = Pick<Database["public"]["Tables"]["admin_config"]["Row"], "id" | "status" | "error_reason" | "updated_at" | "payload">;
type LogLookup = Pick<
  Database["public"]["Tables"]["pipeline_logs"]["Row"],
  "id" | "pipeline_id" | "stage" | "status" | "agent_name" | "message" | "reason" | "attempt" | "metadata" | "created_at"
>;

function toPipelineLog(row: LogLookup): PipelineLog {
  return {
    id: row.id,
    pipeline_id: row.pipeline_id,
    stage: row.stage,
    status: row.status,
    agent_name: row.agent_name,
    message: row.message,
    reason: row.reason,
    attempt: row.attempt,
    metadata: row.metadata && typeof row.metadata === "object" ? (row.metadata as PipelineLog["metadata"]) : {},
    created_at: row.created_at,
  };
}

function normalizeRef(ref: string): string {
  return ref.trim().toLowerCase();
}

async function resolvePipelineId(
  supabase: { from: (table: string) => any },
  pipelineRef: string,
): Promise<{ pipelineId: string; candidates: string[] }> {
  if (UUID_PATTERN.test(pipelineRef)) {
    return { pipelineId: pipelineRef, candidates: [] };
  }

  const normalizedRef = normalizeRef(pipelineRef);
  const { data: queueRows, error: queueError } = await supabase
    .from("admin_config")
    .select("id,updated_at,status,error_reason")
    .order("updated_at", { ascending: false })
    .limit(400);

  if (queueError) {
    throw new Error(`pipeline_resolve_queue_failed:${queueError.message}`);
  }

  const queueCandidates = ((queueRows ?? []) as QueueLookup[])
    .map((row) => row.id)
    .filter((id) => id.toLowerCase().startsWith(normalizedRef));

  if (queueCandidates.length === 1) {
    return { pipelineId: queueCandidates[0], candidates: queueCandidates };
  }
  if (queueCandidates.length > 1) {
    return { pipelineId: "", candidates: queueCandidates.slice(0, 10) };
  }

  const { data: logRows, error: logError } = await supabase
    .from("pipeline_logs")
    .select("pipeline_id,created_at")
    .order("created_at", { ascending: false })
    .limit(800);
  if (logError) {
    throw new Error(`pipeline_resolve_logs_failed:${logError.message}`);
  }

  const uniqueIds = Array.from(
    new Set(((logRows ?? []) as Array<Pick<LogLookup, "pipeline_id">>).map((row) => row.pipeline_id)),
  );
  const logCandidates = uniqueIds.filter((id) => id.toLowerCase().startsWith(normalizedRef));
  if (logCandidates.length === 1) {
    return { pipelineId: logCandidates[0], candidates: logCandidates };
  }
  return { pipelineId: "", candidates: logCandidates.slice(0, 10) };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pipelineRef = (url.searchParams.get("pipelineRef") || "").trim();

  if (!pipelineRef) {
    return jsonError({
      status: 400,
      error: "pipelineRef is required",
      code: "invalid_pipeline_ref",
      headers: NO_STORE_HEADERS,
    });
  }

  return runAdminReadRoute(
    async (auth) => {
      const resolved = await resolvePipelineId(auth.supabase, pipelineRef);
      if (!resolved.pipelineId && resolved.candidates.length === 0) {
        return jsonError({
          status: 404,
          error: "Pipeline not found",
          code: "pipeline_not_found",
          detail: { pipeline_ref: pipelineRef },
          headers: NO_STORE_HEADERS,
        });
      }
      if (!resolved.pipelineId && resolved.candidates.length > 1) {
        return jsonError({
          status: 409,
          error: "Pipeline reference is ambiguous",
          code: "pipeline_ref_ambiguous",
          detail: { pipeline_ref: pipelineRef, candidates: resolved.candidates },
          headers: NO_STORE_HEADERS,
        });
      }

      const pipelineId = resolved.pipelineId;
      const { data: queueRows, error: queueError } = await auth.supabase
        .from("admin_config")
        .select("id,status,error_reason,payload")
        .eq("id", pipelineId)
        .limit(1);
      if (queueError) {
        return jsonError({
          status: 500,
          error: "Failed to fetch pipeline summary",
          code: "pipeline_summary_query_failed",
          detail: queueError.message,
          headers: NO_STORE_HEADERS,
        });
      }

      const queueRow = (queueRows ?? [])[0] as Pick<QueueLookup, "id" | "status" | "error_reason" | "payload"> | undefined;
      if (!queueRow) {
        return jsonError({
          status: 404,
          error: "Pipeline not found",
          code: "pipeline_not_found",
          detail: { pipeline_ref: pipelineRef, pipeline_id: pipelineId },
          headers: NO_STORE_HEADERS,
        });
      }

      const { data: logs, error: logsError } = await auth.supabase
        .from("pipeline_logs")
        .select("id,pipeline_id,stage,status,agent_name,message,reason,attempt,metadata,created_at")
        .eq("pipeline_id", pipelineId)
        .order("created_at", { ascending: true })
        .limit(240);

      if (logsError) {
        return jsonError({
          status: 500,
          error: "Failed to fetch pipeline logs",
          code: "pipeline_logs_query_failed",
          detail: logsError.message,
          headers: NO_STORE_HEADERS,
        });
      }

      const typedLogs = ((logs ?? []) as LogLookup[]).map(toPipelineLog);
      const diagnosticsBase = buildPipelineDiagnostics({
        resolvedPipelineId: pipelineId,
        status: queueRow.status as PipelineStatus,
        errorReason: queueRow.error_reason,
        logs: typedLogs,
      });
      const payload = queueRow.payload && typeof queueRow.payload === "object" ? (queueRow.payload as Record<string, unknown>) : {};
      const diagnostics = applyFailureSnapshotFallback(diagnosticsBase, payload.failure_snapshot);
      return NextResponse.json(diagnostics, { headers: NO_STORE_HEADERS });
    },
    { errorHeaders: NO_STORE_HEADERS },
  );
}
