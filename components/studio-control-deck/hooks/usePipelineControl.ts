import { useCallback, useEffect, useState } from "react";

import type {
  PipelineControlAction,
  PipelineControlResponse,
  PipelineLog,
  PipelineStage,
  PipelineStatus,
  PipelineSummary,
} from "@/types/pipeline";

type UsePipelineControlArgs = {
  previewMode: boolean;
  logs: PipelineLog[];
  selectedPipelineId: string | null;
  controlLabels: Record<PipelineControlAction, string>;
  statusLabels: Record<PipelineStatus, string>;
  stageLabels: Record<PipelineStage, string>;
  refreshRecentLogs: () => Promise<void>;
};

type UsePipelineControlResult = {
  pipelineSummary: PipelineSummary | null;
  busyAction: PipelineControlAction | null;
  feedback: string;
  setFeedback: (value: string) => void;
  refreshSummary: (pipelineId: string | null) => Promise<void>;
  runControl: (action: PipelineControlAction) => Promise<void>;
};

type ErrorResponse = {
  error?: string;
  detail?: unknown;
  reason?: string;
  code?: string;
};

function resolveErrorMessage(payload: ErrorResponse | null | undefined): string {
  if (!payload) return "unknown_error";
  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail;
  }
  if (payload.detail && typeof payload.detail === "object") {
    const row = payload.detail as Record<string, unknown>;
    if (typeof row.reason === "string" && row.reason.trim()) {
      return row.reason;
    }
    if (typeof row.error === "string" && row.error.trim()) {
      return row.error;
    }
  }
  if (typeof payload.reason === "string" && payload.reason.trim()) {
    return payload.reason;
  }
  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }
  if (typeof payload.code === "string" && payload.code.trim()) {
    return payload.code;
  }
  return "unknown_error";
}

export function usePipelineControl({
  previewMode,
  logs,
  selectedPipelineId,
  controlLabels,
  statusLabels,
  stageLabels,
  refreshRecentLogs,
}: UsePipelineControlArgs): UsePipelineControlResult {
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [busyAction, setBusyAction] = useState<PipelineControlAction | null>(null);
  const [feedback, setFeedback] = useState("");

  const refreshSummary = useCallback(
    async (pipelineId: string | null) => {
      if (!pipelineId) {
        setPipelineSummary(null);
        return;
      }

      if (previewMode) {
        const latest = logs.find((log) => log.pipeline_id === pipelineId) ?? null;
        setPipelineSummary({
          pipeline_id: pipelineId,
          keyword: "preview-mission",
          source: "console",
          status: latest?.status ?? "running",
          execution_mode: "manual",
          waiting_for_stage: latest?.stage ?? "build",
          pipeline_version: "preview-v1",
          error_reason: latest?.reason ?? null,
          created_at: latest?.created_at ?? new Date().toISOString(),
          updated_at: latest?.created_at ?? new Date().toISOString(),
        });
        return;
      }

      const response = await fetch(`/api/pipelines/status?pipelineId=${encodeURIComponent(pipelineId)}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as PipelineSummary | ErrorResponse | null;

      if (!response.ok) {
        setPipelineSummary(null);
        const typedError = payload as ErrorResponse | null;
        const reason = resolveErrorMessage(typedError);
        if (response.status === 404) {
          setFeedback(`상태 조회 실패: ${reason} (현재 코어 엔진에서 해당 파이프라인을 찾지 못했습니다)`);
        } else {
          setFeedback(`상태 조회 실패: ${reason}`);
        }
        return;
      }

      setPipelineSummary(payload as PipelineSummary);
    },
    [previewMode, logs],
  );

  useEffect(() => {
    void refreshSummary(selectedPipelineId);
  }, [selectedPipelineId, refreshSummary]);

  const runControl = useCallback(
    async (action: PipelineControlAction) => {
      if (!selectedPipelineId) {
        setFeedback("파이프라인을 먼저 선택해주세요.");
        return;
      }

      if (previewMode) {
        setFeedback(`[프리뷰] ${controlLabels[action]} 시뮬레이션 완료`);
        return;
      }

      setBusyAction(action);
      setFeedback(`${controlLabels[action]} 요청 전송 중...`);

      try {
        const response = await fetch("/api/pipelines/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipelineId: selectedPipelineId, action }),
        });
        const payload = (await response.json().catch(() => null)) as PipelineControlResponse | ErrorResponse | null;
        if (!response.ok) {
          const typedError = payload as ErrorResponse | null;
          const reason = resolveErrorMessage(typedError);
          if (response.status === 404) {
            setFeedback(`제어 실패: ${reason} (선택 파이프라인이 현재 코어 엔진에 없습니다)`);
          } else {
            setFeedback(`제어 실패: ${reason}`);
          }
          return;
        }

        const typed = payload as PipelineControlResponse;
        setFeedback(
          `${controlLabels[action]} 완료 · 상태=${statusLabels[typed.status]} · 대기단계=${typed.waiting_for_stage ? stageLabels[typed.waiting_for_stage] : "-"}`,
        );
        await refreshSummary(selectedPipelineId);
        await refreshRecentLogs();
      } catch (error) {
        setFeedback(`제어 실패: ${error instanceof Error ? error.message : "unknown_error"}`);
      } finally {
        setBusyAction(null);
      }
    },
    [selectedPipelineId, previewMode, controlLabels, statusLabels, stageLabels, refreshSummary, refreshRecentLogs],
  );

  return {
    pipelineSummary,
    busyAction,
    feedback,
    setFeedback,
    refreshSummary,
    runControl,
  };
}
