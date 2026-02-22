"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchRecentPipelineLogs, subscribePipelineLogs } from "@/lib/supabase/realtime";
import type { PipelineLog, PipelineStage, PipelineStatus } from "@/types/pipeline";

const STAGE_FLOW: Array<{
  stage: Exclude<PipelineStage, "done">;
  label: string;
  agent: string;
}> = [
  { stage: "trigger", label: "트리거", agent: "Director" },
  { stage: "plan", label: "기획", agent: "Architect" },
  { stage: "style", label: "스타일", agent: "Stylist" },
  { stage: "build", label: "빌드", agent: "Builder" },
  { stage: "qa", label: "QA", agent: "Sentinel" },
  { stage: "publish", label: "게시", agent: "Publisher" },
  { stage: "echo", label: "홍보", agent: "Echo" },
];

const STATUS_LABELS: Record<PipelineStatus, string> = {
  queued: "대기",
  running: "실행중",
  success: "성공",
  error: "실패",
  retry: "재시도",
  skipped: "건너뜀",
};

function statusTone(status: PipelineStatus | null): string {
  switch (status) {
    case "success":
      return "success";
    case "error":
      return "error";
    case "running":
      return "running";
    case "retry":
      return "warn";
    case "queued":
      return "idle";
    case "skipped":
      return "muted";
    default:
      return "muted";
  }
}

export function ForgeFlowBoard({ initialLogs }: { initialLogs: PipelineLog[] }) {
  const [logs, setLogs] = useState<PipelineLog[]>(initialLogs);
  const [pollMode, setPollMode] = useState<"idle" | "polling">("idle");

  useEffect(() => {
    let closed = false;
    let realtimeReceived = false;

    const upsertLogs = (incoming: PipelineLog[]) => {
      setLogs((prev) => {
        const map = new Map<string, PipelineLog>();
        [...prev, ...incoming].forEach((log) => {
          const key = `${log.pipeline_id}-${log.id ?? ""}-${log.stage}-${log.created_at}`;
          map.set(key, log);
        });
        return Array.from(map.values())
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 400);
      });
    };

    const channel = subscribePipelineLogs((newLog) => {
      realtimeReceived = true;
      upsertLogs([newLog]);
    });

    const poll = async () => {
      try {
        const recent = await fetchRecentPipelineLogs(undefined, 200);
        if (!closed) {
          upsertLogs(recent);
        }
      } catch {
        // Silent fallback; terminal view surfaces enough info.
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
  }, [pollMode]);

  const pipelineSnapshots = useMemo(() => {
    const sorted = [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latestByPipeline = new Map<string, PipelineLog>();
    for (const log of sorted) {
      if (!latestByPipeline.has(log.pipeline_id)) {
        latestByPipeline.set(log.pipeline_id, log);
      }
    }

    const activePipelineId = sorted[0]?.pipeline_id ?? null;
    const latestByStage = new Map<PipelineStage, PipelineLog>();
    for (const log of sorted) {
      if (!latestByStage.has(log.stage)) {
        latestByStage.set(log.stage, log);
      }
    }

    return {
      sorted,
      activePipelineId,
      latestByPipeline,
      latestByStage,
      observedPipelines: latestByPipeline.size,
    };
  }, [logs]);

  const latestLog = pipelineSnapshots.sorted[0] ?? null;

  const compactMessage = (message?: string | null) => {
    if (!message) {
      return "아직 실행 로그가 없습니다. 트리거를 실행하면 여기부터 흐름이 채워집니다.";
    }
    const normalized = message.replace(/\s+/g, " ").trim();
    if (normalized.length <= 140) return normalized;
    return `${normalized.slice(0, 140)}…`;
  };

  return (
    <section className="surface console-flow">
      <div className="section-head">
        <div>
          <p className="eyebrow">라이브 파이프라인</p>
          <h2 className="section-title">ForgeFlow Mission Board</h2>
          <p className="section-subtitle">
            에이전트들이 어떤 단계에서 작업 중인지 실시간 로그 기준으로 시각화합니다.
          </p>
        </div>
        <div className="stat-inline-list">
          {pollMode === "polling" ? (
            <div className="stat-inline">
              <span className="stat-inline-label">로그 모드</span>
              <strong>polling</strong>
            </div>
          ) : null}
          <div className="stat-inline">
            <span className="stat-inline-label">관측 파이프라인</span>
            <strong>{pipelineSnapshots.observedPipelines}</strong>
          </div>
          <div className="stat-inline">
            <span className="stat-inline-label">최근 단계</span>
            <strong>{latestLog ? `${latestLog.stage}` : "-"}</strong>
          </div>
        </div>
      </div>

      <div className="flow-board">
        {STAGE_FLOW.map((lane) => {
          const stageLog = pipelineSnapshots.latestByStage.get(lane.stage) ?? null;
          const isActive = Boolean(stageLog && stageLog.pipeline_id === pipelineSnapshots.activePipelineId);
          const tone = statusTone(stageLog?.status ?? null);

          return (
            <article
              key={lane.stage}
              className={`flow-lane tone-${tone}${isActive ? " is-active" : ""}`}
              aria-label={`${lane.stage} lane`}
            >
              <div className="flow-lane-head">
                <div>
                  <p className="flow-lane-kicker">{lane.agent}</p>
                  <h3>{lane.label}</h3>
                </div>
                <span className={`status-chip tone-${tone}`}>
                  {stageLog ? STATUS_LABELS[stageLog.status] : "대기전"}
                </span>
              </div>

              <p className="flow-lane-message" title={stageLog?.message ?? undefined}>
                {compactMessage(stageLog?.message)}
              </p>

              <div className="flow-lane-foot">
                <span>stage: {lane.stage}</span>
                <span>{stageLog ? new Date(stageLog.created_at).toLocaleTimeString() : "-"}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
