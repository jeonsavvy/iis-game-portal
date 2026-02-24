"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchRecentPipelineLogs, subscribePipelineLogs } from "@/lib/supabase/realtime";
import type {
  PipelineControlAction,
  PipelineControlResponse,
  PipelineLog,
  PipelineStage,
  PipelineStatus,
  PipelineSummary,
} from "@/types/pipeline";
import { ForgeFlowBoard } from "@/components/ForgeFlowBoard";
import { ManualApprovalForm } from "@/components/ManualApprovalForm";
import { PipelineTerminal } from "@/components/PipelineTerminal";
import { TriggerForm } from "@/components/TriggerForm";

const STAGE_FLOW: Array<{ stage: Exclude<PipelineStage, "done">; label: string; agent: string }> = [
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
  skipped: "일시정지",
};

const CONTROL_LABELS: Record<PipelineControlAction, string> = {
  pause: "Pause",
  resume: "Resume",
  cancel: "Stop",
  retry: "Retry",
};

const MOBILE_TABS = [
  { key: "board", label: "Board" },
  { key: "activity", label: "Activity" },
  { key: "control", label: "Control" },
  { key: "logs", label: "Logs" },
] as const;

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

function compactMessage(message?: string | null): string {
  if (!message) {
    return "로그 대기중";
  }
  const normalized = message.replace(/\s+/g, " ").trim();
  if (normalized.length <= 120) return normalized;
  return `${normalized.slice(0, 120)}…`;
}

export function StudioControlDeck({ initialLogs }: { initialLogs: PipelineLog[] }) {
  const [logs, setLogs] = useState<PipelineLog[]>(initialLogs);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(initialLogs[0]?.pipeline_id ?? null);
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [busyAction, setBusyAction] = useState<PipelineControlAction | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [pollMode, setPollMode] = useState<"idle" | "polling">("idle");
  const [mobileTab, setMobileTab] = useState<(typeof MOBILE_TABS)[number]["key"]>("board");

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
          .slice(0, 500);
      });
    };

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
        // no-op
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
    if (!selectedPipelineId && pipelines.length > 0) {
      setSelectedPipelineId(pipelines[0].pipeline_id);
    }
  }, [pipelines, selectedPipelineId]);

  const selectedLogs = useMemo(() => {
    if (!selectedPipelineId) return [];
    return logs
      .filter((log) => log.pipeline_id === selectedPipelineId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [logs, selectedPipelineId]);

  const latestStageMap = useMemo(() => {
    const map = new Map<PipelineStage, PipelineLog>();
    for (const log of selectedLogs) {
      if (!map.has(log.stage)) {
        map.set(log.stage, log);
      }
    }
    return map;
  }, [selectedLogs]);

  const globalStatus = useMemo(() => {
    const counts: Record<string, number> = {
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

  const refreshSummary = async (pipelineId: string | null) => {
    if (!pipelineId) {
      setPipelineSummary(null);
      return;
    }
    const response = await fetch(`/api/pipelines/status?pipelineId=${encodeURIComponent(pipelineId)}`, {
      method: "GET",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as PipelineSummary | { error?: string; detail?: string } | null;
    if (!response.ok) {
      setPipelineSummary(null);
      setFeedback(`상태 조회 실패: ${(payload as { detail?: string; error?: string } | null)?.detail ?? (payload as { error?: string } | null)?.error ?? "unknown_error"}`);
      return;
    }
    setPipelineSummary(payload as PipelineSummary);
  };

  useEffect(() => {
    void refreshSummary(selectedPipelineId);
  }, [selectedPipelineId]);

  const runControl = async (action: PipelineControlAction) => {
    if (!selectedPipelineId) {
      setFeedback("파이프라인을 먼저 선택해주세요.");
      return;
    }

    setBusyAction(action);
    setFeedback(`${CONTROL_LABELS[action]} 요청 전송 중...`);

    try {
      const response = await fetch("/api/pipelines/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineId: selectedPipelineId, action }),
      });
      const payload = (await response.json().catch(() => null)) as
        | PipelineControlResponse
        | { error?: string; detail?: string }
        | null;

      if (!response.ok) {
        const err = payload as { detail?: string; error?: string } | null;
        setFeedback(`제어 실패: ${err?.detail ?? err?.error ?? "unknown_error"}`);
        return;
      }

      const typed = payload as PipelineControlResponse;
      setFeedback(
        `${CONTROL_LABELS[action]} 완료 · status=${typed.status} · waiting=${typed.waiting_for_stage ?? "-"} · reason=${typed.error_reason ?? "-"}`,
      );
      await refreshSummary(selectedPipelineId);
      const recent = await fetchRecentPipelineLogs(undefined, 220);
      setLogs(recent);
    } catch (error) {
      setFeedback(`제어 실패: ${error instanceof Error ? error.message : "unknown_error"}`);
    } finally {
      setBusyAction(null);
    }
  };

  const latestSelectedLog = selectedLogs[0] ?? null;

  return (
    <section className="studio-control-deck">
      <section className="surface mission-toolbar">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">Mission Control</p>
            <h3 className="section-title">멀티에이전트 운영실</h3>
            <p className="section-subtitle">실행 흐름 · QA 경고/치명 · 오퍼레이터 제어를 한 화면에서 관측합니다.</p>
          </div>
          <div className="mission-status-inline">
            <span className="status-chip tone-running">running {globalStatus.running}</span>
            <span className="status-chip tone-warn">retry {globalStatus.retry}</span>
            <span className="status-chip tone-error">error {globalStatus.error}</span>
            <span className="status-chip tone-success">success {globalStatus.success}</span>
            {pollMode === "polling" ? <span className="status-chip tone-warn">polling</span> : null}
          </div>
        </div>

        <div className="mission-toolbar-grid">
          <label className="field">
            <span>관측 파이프라인</span>
            <select
              className="input"
              value={selectedPipelineId ?? ""}
              onChange={(event) => setSelectedPipelineId(event.target.value || null)}
            >
              {pipelines.length === 0 ? <option value="">(no pipeline)</option> : null}
              {pipelines.map((item) => (
                <option key={item.pipeline_id} value={item.pipeline_id}>
                  {item.pipeline_id.slice(0, 8)} · {item.stage} · {item.status} · {compactMessage(item.message)}
                </option>
              ))}
            </select>
          </label>

          <div className="mission-control-buttons">
            {(["pause", "resume", "cancel", "retry"] as PipelineControlAction[]).map((action) => (
              <button
                key={action}
                className={`button ${action === "cancel" ? "button-danger" : action === "resume" ? "button-primary" : "button-ghost"}`}
                type="button"
                disabled={!selectedPipelineId || busyAction !== null}
                onClick={() => {
                  void runControl(action);
                }}
              >
                {busyAction === action ? `${CONTROL_LABELS[action]}...` : CONTROL_LABELS[action]}
              </button>
            ))}
          </div>
        </div>

        <div className="mission-context-row">
          <span className="terminal-tag">selected: {selectedPipelineId ? selectedPipelineId.slice(0, 12) : "-"}</span>
          <span className="terminal-tag subtle">status: {pipelineSummary?.status ?? latestSelectedLog?.status ?? "-"}</span>
          <span className="terminal-tag subtle">mode: {pipelineSummary?.execution_mode ?? "-"}</span>
          <span className="terminal-tag subtle">waiting: {pipelineSummary?.waiting_for_stage ?? "-"}</span>
        </div>

        {feedback ? <p className="inline-feedback">{feedback}</p> : null}

        <div className="mission-mobile-tabs">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`button button-ghost${mobileTab === tab.key ? " is-active" : ""}`}
              type="button"
              onClick={() => setMobileTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className={`mission-pane ${mobileTab === "board" ? "is-active" : ""}`}>
        <ForgeFlowBoard
          initialLogs={logs}
          selectedPipelineId={selectedPipelineId}
          onSelectPipeline={setSelectedPipelineId}
          live={false}
        />
      </section>

      <section className={`surface mission-activity-pane mission-pane ${mobileTab === "activity" ? "is-active" : ""}`}>
        <div className="section-head compact">
          <div>
            <p className="eyebrow">Activity Rail</p>
            <h3 className="section-title">선택 파이프라인 이벤트</h3>
          </div>
          <span className="muted-text">{selectedLogs.length} logs</span>
        </div>
        <ul className="activity-list mission-activity-list">
          {selectedLogs.length === 0 ? <li className="muted-text">선택된 파이프라인 로그가 없습니다.</li> : null}
          {selectedLogs.slice(0, 18).map((log) => {
            const fatalErrors = Array.isArray(log.metadata?.fatal_errors)
              ? (log.metadata.fatal_errors as unknown[]).filter((entry) => typeof entry === "string").length
              : 0;
            const warnings = Array.isArray(log.metadata?.non_fatal_warnings)
              ? (log.metadata.non_fatal_warnings as unknown[]).filter((entry) => typeof entry === "string").length
              : 0;
            return (
              <li key={`${log.pipeline_id}-${log.id ?? log.created_at}-${log.stage}`}>
                <span className={`status-chip tone-${statusTone(log.status)}`}>{STATUS_LABELS[log.status]}</span>
                <div className="activity-main">
                  <strong>{log.stage}</strong> · {compactMessage(log.message)}
                  {(fatalErrors > 0 || warnings > 0) && (
                    <span className="activity-metrics">
                      fatal {fatalErrors} · warning {warnings}
                    </span>
                  )}
                </div>
                <span className="activity-time">{new Date(log.created_at).toLocaleTimeString()}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={`surface mission-control-pane mission-pane ${mobileTab === "control" ? "is-active" : ""}`}>
        <div className="mission-control-grid">
          <TriggerForm
            className="mission-control-card"
            onTriggered={(item) => {
              setSelectedPipelineId(item.pipelineId);
              setFeedback(`신규 파이프라인 등록: ${item.pipelineId}`);
            }}
          />
          <ManualApprovalForm
            className="mission-control-card"
            defaultPipelineId={selectedPipelineId ?? undefined}
            onApproved={({ pipelineId }) => {
              setSelectedPipelineId(pipelineId);
              void refreshSummary(pipelineId);
            }}
          />
        </div>
      </section>

      <section className={`mission-pane ${mobileTab === "logs" ? "is-active" : ""}`}>
        <PipelineTerminal initialLogs={selectedPipelineId ? selectedLogs : logs} pipelineId={selectedPipelineId ?? undefined} />
      </section>

      <section className="surface mission-stage-strip">
        {STAGE_FLOW.map((lane) => {
          const stageLog = latestStageMap.get(lane.stage) ?? null;
          const tone = statusTone(stageLog?.status ?? null);
          const waiting = pipelineSummary?.waiting_for_stage === lane.stage;
          return (
            <article key={lane.stage} className={`mission-stage-card tone-${tone}${waiting ? " waiting" : ""}`}>
              <p className="flow-lane-kicker">{lane.agent}</p>
              <strong>{lane.label}</strong>
              <span className={`status-chip tone-${tone}`}>{stageLog ? STATUS_LABELS[stageLog.status] : waiting ? "대기" : "-"}</span>
              <p className="muted-text">{stageLog ? compactMessage(stageLog.message) : waiting ? "승인 대기중" : "관측 없음"}</p>
            </article>
          );
        })}
      </section>
    </section>
  );
}
