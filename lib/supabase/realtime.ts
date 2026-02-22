import type { RealtimeChannel } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PipelineLog } from "@/types/pipeline";

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
