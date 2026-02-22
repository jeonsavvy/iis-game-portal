import type { RealtimeChannel } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PipelineLog } from "@/types/pipeline";

export async function fetchRecentPipelineLogs(pipelineId?: string, limit = 180): Promise<PipelineLog[]> {
  const params = new URLSearchParams();
  if (pipelineId) {
    params.set("pipelineId", pipelineId);
  }
  params.set("limit", String(limit));

  const response = await fetch(`/api/pipelines/logs?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const raw = await response.text();
  let payload: { logs?: PipelineLog[]; error?: string } = {};
  try {
    payload = raw ? (JSON.parse(raw) as { logs?: PipelineLog[]; error?: string }) : {};
  } catch {
    payload = { error: raw || "Invalid response" };
  }

  if (!response.ok) {
    throw new Error(payload.error || `http_${response.status}`);
  }

  return Array.isArray(payload.logs) ? payload.logs : [];
}

export function subscribePipelineLogs(onLog: (log: PipelineLog) => void, pipelineId?: string): RealtimeChannel {
  const supabase = createSupabaseBrowserClient();

  const filter = pipelineId ? `pipeline_id=eq.${pipelineId}` : undefined;

  const channel = supabase
    .channel(`pipeline-logs-${pipelineId ?? "all"}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "pipeline_logs",
        filter,
      },
      (payload) => {
        onLog(payload.new as PipelineLog);
      },
    )
    .subscribe();

  return channel;
}
