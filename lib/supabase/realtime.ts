import type { RealtimeChannel } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PipelineLog } from "@/types/pipeline";

export async function fetchRecentPipelineLogs(pipelineId?: string, limit = 180): Promise<PipelineLog[]> {
  const supabase = createSupabaseBrowserClient();
  let query = supabase.from("pipeline_logs").select("*").order("created_at", { ascending: false }).limit(limit);

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as PipelineLog[];
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
