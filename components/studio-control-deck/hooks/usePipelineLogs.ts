import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchRecentPipelineLogs, subscribePipelineLogs } from "@/lib/supabase/realtime";
import type { PipelineLog, PipelineStatus } from "@/types/pipeline";

type PipelineTelemetry = {
  found: number;
  built: number;
  sent: number;
  replied: number;
};

type UsePipelineLogsArgs = {
  initialLogs: PipelineLog[];
  previewMode: boolean;
};

type UsePipelineLogsResult = {
  logs: PipelineLog[];
  selectedPipelineId: string | null;
  setSelectedPipelineId: (pipelineId: string | null) => void;
  pipelines: PipelineLog[];
  selectedLogs: PipelineLog[];
  latestStageMap: Map<PipelineLog["stage"], PipelineLog>;
  pollMode: "idle" | "polling";
  globalStatus: Record<PipelineStatus, number>;
  telemetry: PipelineTelemetry;
  recentFailures: PipelineLog[];
  refreshRecentLogs: () => Promise<void>;
};

function buildLogKey(log: PipelineLog): string {
  return `${log.pipeline_id}-${log.id ?? ""}-${log.stage}-${log.created_at}`;
}

export function usePipelineLogs({ initialLogs, previewMode }: UsePipelineLogsArgs): UsePipelineLogsResult {
  const [logs, setLogs] = useState<PipelineLog[]>(initialLogs);
  const [selectedPipelineId, setSelectedPipelineIdState] = useState<string | null>(initialLogs[0]?.pipeline_id ?? null);
  const [selectionLocked, setSelectionLocked] = useState<boolean>(false);
  const [pollMode, setPollMode] = useState<"idle" | "polling">("idle");

  const setSelectedPipelineId = useCallback((pipelineId: string | null) => {
    setSelectionLocked(true);
    setSelectedPipelineIdState(pipelineId);
  }, []);

  const upsertLogs = useCallback((incoming: PipelineLog[]) => {
    setLogs((prev) => {
      const map = new Map<string, PipelineLog>();
      [...prev, ...incoming].forEach((log) => {
        map.set(buildLogKey(log), log);
      });
      return Array.from(map.values())
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 500);
    });
  }, []);

  const refreshRecentLogs = useCallback(async () => {
    if (previewMode) {
      return;
    }
    const recent = await fetchRecentPipelineLogs(undefined, 220);
    upsertLogs(recent);
  }, [previewMode, upsertLogs]);

  useEffect(() => {
    if (previewMode) {
      return;
    }

    let closed = false;
    let realtimeReceived = false;

    const channel = subscribePipelineLogs((newLog) => {
      realtimeReceived = true;
      upsertLogs([newLog]);
    });

    const poll = async () => {
      try {
        const recent = await fetchRecentPipelineLogs(undefined, 220);
        if (!closed) {
          upsertLogs(recent);
        }
      } catch {
        // polling fallback best-effort
      }
    };

    const warmupTimer = window.setTimeout(() => {
      if (!realtimeReceived && !closed) {
        setPollMode("polling");
      }
    }, 4000);

    const interval = window.setInterval(() => {
      if (!closed && (!realtimeReceived || pollMode === "polling")) {
        void poll();
      }
    }, 3000);

    return () => {
      closed = true;
      window.clearTimeout(warmupTimer);
      window.clearInterval(interval);
      channel.unsubscribe();
    };
  }, [pollMode, previewMode, upsertLogs]);

  const pipelines = useMemo(() => {
    const sorted = [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latestByPipeline = new Map<string, PipelineLog>();
    for (const log of sorted) {
      if (!latestByPipeline.has(log.pipeline_id)) {
        latestByPipeline.set(log.pipeline_id, log);
      }
    }
    return Array.from(latestByPipeline.values());
  }, [logs]);

  useEffect(() => {
    if (pipelines.length === 0) {
      if (selectedPipelineId) {
        setSelectedPipelineIdState(null);
      }
      return;
    }

    const selected = selectedPipelineId ? pipelines.find((item) => item.pipeline_id === selectedPipelineId) ?? null : null;
    const preferred =
      pipelines.find((item) => item.status === "running") ??
      pipelines.find((item) => item.status === "queued") ??
      pipelines.find((item) => item.status === "retry") ??
      pipelines.find((item) => item.status === "skipped") ??
      pipelines[0];

    if (!selected) {
      if (preferred && preferred.pipeline_id !== selectedPipelineId) {
        setSelectionLocked(false);
        setSelectedPipelineIdState(preferred.pipeline_id);
      }
      return;
    }

    if (selectionLocked) {
      return;
    }

    if (preferred && preferred.pipeline_id !== selectedPipelineId) {
      setSelectedPipelineIdState(preferred.pipeline_id);
    }
  }, [pipelines, selectedPipelineId, selectionLocked]);

  const selectedLogs = useMemo(() => {
    if (!selectedPipelineId) {
      return [];
    }
    return logs.filter((log) => log.pipeline_id === selectedPipelineId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [logs, selectedPipelineId]);

  const latestStageMap = useMemo(() => {
    const map = new Map<PipelineLog["stage"], PipelineLog>();
    for (const log of selectedLogs) {
      if (!map.has(log.stage)) {
        map.set(log.stage, log);
      }
    }
    return map;
  }, [selectedLogs]);

  const globalStatus = useMemo(() => {
    const counts: Record<PipelineStatus, number> = {
      queued: 0,
      running: 0,
      retry: 0,
      error: 0,
      success: 0,
      skipped: 0,
    };
    for (const item of pipelines) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    return counts;
  }, [pipelines]);

  const telemetry = useMemo(
    () => ({
      found: selectedLogs.filter((log) => log.stage === "plan" && log.status === "success").length,
      built: selectedLogs.filter((log) => log.stage === "build" && log.status === "success").length,
      sent: selectedLogs.filter((log) => log.stage === "release" && log.status === "success").length,
      replied: selectedLogs.filter((log) => log.stage === "report" && log.status === "success").length,
    }),
    [selectedLogs],
  );

  const recentFailures = useMemo(
    () => selectedLogs.filter((log) => log.status === "error" || log.status === "retry").slice(0, 6),
    [selectedLogs],
  );

  return {
    logs,
    selectedPipelineId,
    setSelectedPipelineId,
    pipelines,
    selectedLogs,
    latestStageMap,
    pollMode,
    globalStatus,
    telemetry,
    recentFailures,
    refreshRecentLogs,
  };
}
