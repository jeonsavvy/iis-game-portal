"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { ManualApprovalForm } from "@/components/ManualApprovalForm";
import { TriggerForm } from "@/components/TriggerForm";
import { fetchRecentPipelineLogs, subscribePipelineLogs } from "@/lib/supabase/realtime";
import type {
  PipelineControlAction,
  PipelineControlResponse,
  PipelineLog,
  PipelineStage,
  PipelineStatus,
  PipelineSummary,
} from "@/types/pipeline";

const STAGE_FLOW: Array<{ stage: Exclude<PipelineStage, "done">; label: string; agent: string }> = [
  { stage: "trigger", label: "스카우트", agent: "디렉터" },
  { stage: "plan", label: "인텔", agent: "아키텍트" },
  { stage: "style", label: "스타일", agent: "스타일리스트" },
  { stage: "build", label: "빌더", agent: "빌더" },
  { stage: "qa", label: "센티널", agent: "센티널" },
  { stage: "publish", label: "아웃리치", agent: "퍼블리셔" },
  { stage: "echo", label: "클로저", agent: "에코" },
];

const AGENT_LAYOUT: Array<{
  stage: Exclude<PipelineStage, "done">;
  role: string;
  title: string;
  gridColumn: number;
  gridRow: number;
  icon: "scout" | "intel" | "stylist" | "builder" | "sentinel" | "publisher" | "echo";
}> = [
  { stage: "trigger", role: "디렉터", title: "스카우트", gridColumn: 1, gridRow: 1, icon: "scout" },
  { stage: "plan", role: "아키텍트", title: "인텔", gridColumn: 2, gridRow: 1, icon: "intel" },
  { stage: "build", role: "빌더", title: "빌더", gridColumn: 3, gridRow: 1, icon: "builder" },
  { stage: "style", role: "스타일리스트", title: "스타일", gridColumn: 1, gridRow: 2, icon: "stylist" },
  { stage: "qa", role: "센티널", title: "센티널", gridColumn: 2, gridRow: 2, icon: "sentinel" },
  { stage: "publish", role: "퍼블리셔", title: "아웃리치", gridColumn: 3, gridRow: 2, icon: "publisher" },
  { stage: "echo", role: "에코", title: "클로저", gridColumn: 2, gridRow: 3, icon: "echo" },
];

const STATUS_LABELS: Record<PipelineStatus, string> = {
  queued: "대기",
  running: "동작중",
  success: "완료",
  error: "실패",
  retry: "재시도",
  skipped: "일시정지",
};

const CONTROL_LABELS: Record<PipelineControlAction, string> = {
  pause: "일시정지",
  resume: "재개",
  cancel: "중단",
  retry: "재시도",
};

const MOBILE_TABS = [
  { key: "board", label: "운영보드" },
  { key: "activity", label: "활동" },
  { key: "control", label: "제어" },
] as const;

const STAGE_LABELS: Record<PipelineStage, string> = {
  trigger: "트리거",
  plan: "기획",
  style: "스타일",
  build: "빌드",
  qa: "QA",
  publish: "게시",
  echo: "홍보",
  done: "완료",
};

const AGENT_LABELS: Record<string, string> = {
  Trigger: "트리거",
  Architect: "아키텍트",
  Stylist: "스타일리스트",
  Builder: "빌더",
  Sentinel: "센티널",
  Publisher: "퍼블리셔",
  Echo: "에코",
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

function compactMessage(message?: string | null): string {
  if (!message) return "대기중";
  const normalized = message.replace(/\s+/g, " ").trim();
  if (normalized.length <= 84) return normalized;
  return `${normalized.slice(0, 84)}…`;
}

function qualitySignals(log: PipelineLog | null): { fatal: number; warning: number } {
  if (!log || !log.metadata || typeof log.metadata !== "object") {
    return { fatal: 0, warning: 0 };
  }
  const metadata = log.metadata as Record<string, unknown>;
  const fatal = Array.isArray(metadata.fatal_errors) ? metadata.fatal_errors.filter((entry) => typeof entry === "string").length : 0;
  const warning = Array.isArray(metadata.non_fatal_warnings)
    ? metadata.non_fatal_warnings.filter((entry) => typeof entry === "string").length
    : 0;
  return { fatal, warning };
}

function AgentGlyph({
  icon,
  tone,
  active,
}: {
  icon: "scout" | "intel" | "stylist" | "builder" | "sentinel" | "publisher" | "echo";
  tone: string;
  active: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const gradA = `${uid}-a`;
  const gradB = `${uid}-b`;
  const radar = `${uid}-r`;

  const antenna =
    icon === "scout" ? (
      <path d="M40 18 L40 10 M32 14 L40 10 L48 14" stroke="#dbeafe" strokeWidth="2" strokeLinecap="round" fill="none" />
    ) : null;
  const badge =
    icon === "builder" ? (
      <rect x="47" y="27" width="11" height="9" rx="2" fill="#93c5fd" stroke="#1e3a8a" strokeWidth="1" />
    ) : icon === "publisher" ? (
      <path d="M49 28 L58 34 L49 40 Z" fill="#fca5a5" />
    ) : icon === "intel" ? (
      <circle cx="53" cy="29" r="5" fill="#fde047" stroke="#854d0e" strokeWidth="1" />
    ) : icon === "stylist" ? (
      <path d="M50 27 C54 23 58 23 60 27 C57 30 53 31 49 30 Z" fill="#f5d0fe" />
    ) : icon === "sentinel" ? (
      <path d="M49 26 L58 26 L56 31 L51 31 Z" fill="#bbf7d0" />
    ) : icon === "echo" ? (
      <rect x="49" y="26" width="10" height="10" rx="2" fill="#fecdd3" />
    ) : null;

  return (
    <svg className={`agent-glyph tone-${tone}${active ? " is-active" : ""}`} viewBox="0 0 80 80" aria-hidden="true">
      <defs>
        <radialGradient id={gradA} cx="40%" cy="35%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="65%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
        <radialGradient id={gradB} cx="45%" cy="32%">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        <radialGradient id={radar} cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(56,189,248,0.5)" />
          <stop offset="100%" stopColor="rgba(15,23,42,0)" />
        </radialGradient>
      </defs>

      <circle cx="40" cy="40" r="36" fill={`url(#${radar})`} opacity="0.18">
        <animate attributeName="r" values="32;37;32" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <ellipse cx="40" cy="47" rx="21" ry="17" fill={`url(#${gradA})`} />
      <ellipse cx="40" cy="44" rx="10" ry="10" fill={`url(#${gradB})`} />
      <circle cx="34" cy="40" r="2.2" fill="#f8fafc" />
      <circle cx="46" cy="40" r="2.2" fill="#f8fafc" />
      <path d="M28 51 C34 57 46 57 52 51" stroke="#fecaca" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M19 47 C14 46 11 42 11 37 C14 35 17 35 21 37" stroke="#dc2626" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M61 47 C66 46 69 42 69 37 C66 35 63 35 59 37" stroke="#dc2626" strokeWidth="4" fill="none" strokeLinecap="round" />
      {antenna}
      {badge}
    </svg>
  );
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
        if (!closed) upsertLogs(recent);
      } catch {
        // ignore network fallback errors
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
    return logs.filter((log) => log.pipeline_id === selectedPipelineId).sort((a, b) => b.created_at.localeCompare(a.created_at));
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
    const counts: Record<string, number> = { queued: 0, running: 0, retry: 0, error: 0, success: 0, skipped: 0 };
    for (const item of pipelines) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    return counts;
  }, [pipelines]);

  const telemetry = useMemo(
    () => ({
      found: selectedLogs.filter((log) => log.stage === "plan" && log.status === "success").length,
      built: selectedLogs.filter((log) => log.stage === "build" && log.status === "success").length,
      sent: selectedLogs.filter((log) => log.stage === "publish" && log.status === "success").length,
      replied: selectedLogs.filter((log) => log.stage === "echo" && log.status === "success").length,
    }),
    [selectedLogs],
  );

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
      setFeedback(
        `상태 조회 실패: ${(payload as { detail?: string; error?: string } | null)?.detail ?? (payload as { error?: string } | null)?.error ?? "unknown_error"}`,
      );
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
      const payload = (await response.json().catch(() => null)) as PipelineControlResponse | { error?: string; detail?: string } | null;
      if (!response.ok) {
        const err = payload as { detail?: string; error?: string } | null;
        setFeedback(`제어 실패: ${err?.detail ?? err?.error ?? "unknown_error"}`);
        return;
      }

      const typed = payload as PipelineControlResponse;
      setFeedback(`${CONTROL_LABELS[action]} 완료 · 상태=${STATUS_LABELS[typed.status]} · 대기단계=${typed.waiting_for_stage ? STAGE_LABELS[typed.waiting_for_stage] : "-"}`);
      await refreshSummary(selectedPipelineId);
      const recent = await fetchRecentPipelineLogs(undefined, 220);
      setLogs(recent);
    } catch (error) {
      setFeedback(`제어 실패: ${error instanceof Error ? error.message : "unknown_error"}`);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <section className="studio-control-deck">
      <section className="surface mission-toolbar">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">운영 데크</p>
            <h3 className="section-title">멀티 에이전트 운영실</h3>
            <p className="section-subtitle">선택 파이프라인 중심으로 지금 누가 무엇을 하는지 실시간으로 표시합니다.</p>
          </div>
          <div className="mission-status-inline">
            <span className="status-chip tone-running">동작 {globalStatus.running}</span>
            <span className="status-chip tone-warn">재시도 {globalStatus.retry}</span>
            <span className="status-chip tone-error">오류 {globalStatus.error}</span>
            <span className="status-chip tone-success">완료 {globalStatus.success}</span>
            {pollMode === "polling" ? <span className="status-chip tone-warn">폴링 보조</span> : null}
          </div>
        </div>

        <div className="mission-toolbar-grid">
          <label className="field">
            <span>관측 파이프라인</span>
            <select className="input" value={selectedPipelineId ?? ""} onChange={(event) => setSelectedPipelineId(event.target.value || null)}>
              {pipelines.length === 0 ? <option value="">(파이프라인 없음)</option> : null}
              {pipelines.map((item) => (
                <option key={item.pipeline_id} value={item.pipeline_id}>
                  {item.pipeline_id.slice(0, 8)} · {STAGE_LABELS[item.stage]} · {STATUS_LABELS[item.status]} · {compactMessage(item.message)}
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
                onClick={() => void runControl(action)}
              >
                {busyAction === action ? `${CONTROL_LABELS[action]}...` : CONTROL_LABELS[action]}
              </button>
            ))}
          </div>
        </div>

        <div className="mission-context-row">
          <span className="terminal-tag">파이프라인: {selectedPipelineId ? selectedPipelineId.slice(0, 12) : "-"}</span>
          <span className="terminal-tag subtle">상태: {pipelineSummary?.status ? STATUS_LABELS[pipelineSummary.status] : "-"}</span>
          <span className="terminal-tag subtle">모드: {pipelineSummary?.execution_mode === "manual" ? "수동" : pipelineSummary?.execution_mode === "auto" ? "자동" : "-"}</span>
          <span className="terminal-tag subtle">대기 단계: {pipelineSummary?.waiting_for_stage ? STAGE_LABELS[pipelineSummary.waiting_for_stage] : "-"}</span>
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

      <section className={`surface war-room-shell mission-pane ${mobileTab === "board" ? "is-active" : ""}`}>
        <div className="war-room-layout">
          <section className="war-room-map">
            <div className="war-room-map-head">
              <div className="war-room-counter-strip">
                <span className="war-counter">
                  <strong>{telemetry.found}</strong>
                  <small>기획 완료</small>
                </span>
                <span className="war-counter">
                  <strong>{telemetry.built}</strong>
                  <small>빌드 완료</small>
                </span>
                <span className="war-counter">
                  <strong>{telemetry.sent}</strong>
                  <small>게시 완료</small>
                </span>
                <span className="war-counter">
                  <strong>{telemetry.replied}</strong>
                  <small>홍보 완료</small>
                </span>
              </div>
            </div>

            <div className="war-room-canvas">
              <svg className="war-room-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path d="M17 16 L50 16 L83 16" />
                <path d="M17 16 L17 50 L50 50 L83 50" />
                <path d="M50 16 L50 50" />
                <path d="M83 16 L83 50 L50 82" />
              </svg>

              <div className="war-room-node-grid">
                {AGENT_LAYOUT.map((agent) => {
                  const stageLog = latestStageMap.get(agent.stage) ?? null;
                  const tone = statusTone(stageLog?.status ?? null);
                  const waiting = pipelineSummary?.waiting_for_stage === agent.stage;
                  const signals = qualitySignals(stageLog);
                  const active = stageLog?.status === "running" || waiting;
                  return (
                    <article
                      key={agent.stage}
                      className={`war-node tone-${tone}${waiting ? " waiting" : ""}${active ? " is-live" : ""}`}
                      style={{ gridColumn: `${agent.gridColumn} / span 1`, gridRow: `${agent.gridRow} / span 1` }}
                    >
                      <div className="war-node-top">
                        <AgentGlyph icon={agent.icon} tone={tone} active={active} />
                        <div>
                          <p>{agent.role}</p>
                          <h4>{agent.title}</h4>
                        </div>
                      </div>
                      <p className="war-node-message">{compactMessage(stageLog?.message ?? (waiting ? "승인 대기중" : "유휴"))}</p>
                      <div className="war-node-foot">
                        <span className={`status-chip tone-${tone}`}>
                          {stageLog ? STATUS_LABELS[stageLog.status] : waiting ? "대기" : "유휴"}
                        </span>
                        <span>{stageLog ? new Date(stageLog.created_at).toLocaleTimeString() : "-"}</span>
                      </div>
                      {(signals.fatal > 0 || signals.warning > 0) && (
                        <p className="war-node-signal">
                          치명 {signals.fatal} · 경고 {signals.warning}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="war-room-activity">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">활동 레일</p>
                <h3 className="section-title">실시간 임무 피드</h3>
              </div>
              <span className="muted-text">{selectedLogs.length}개 로그</span>
            </div>

            <ul className="war-activity-list">
              {selectedLogs.length === 0 ? <li className="muted-text">선택된 파이프라인 로그가 없습니다.</li> : null}
              {selectedLogs.slice(0, 22).map((log) => {
                const tone = statusTone(log.status);
                const signals = qualitySignals(log);
                return (
                  <li key={`${log.pipeline_id}-${log.id ?? log.created_at}-${log.stage}`} className={`war-activity-item tone-${tone}`}>
                    <span className={`status-chip tone-${tone}`}>{STATUS_LABELS[log.status]}</span>
                    <div>
                      <strong>
                        {STAGE_LABELS[log.stage]} · {AGENT_LABELS[log.agent_name] ?? log.agent_name}
                      </strong>
                      <p>{compactMessage(log.message)}</p>
                      {(signals.fatal > 0 || signals.warning > 0) && (
                        <small>
                          치명 {signals.fatal} · 경고 {signals.warning}
                        </small>
                      )}
                    </div>
                    <time>{new Date(log.created_at).toLocaleTimeString()}</time>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </section>

      <section className={`surface mission-activity-pane mission-pane ${mobileTab === "activity" ? "is-active" : ""}`}>
        <div className="section-head compact">
          <div>
            <p className="eyebrow">활동</p>
            <h3 className="section-title">모바일 이벤트 피드</h3>
          </div>
          <span className="muted-text">{selectedLogs.length}개 로그</span>
        </div>
        <ul className="activity-list mission-activity-list">
          {selectedLogs.length === 0 ? <li className="muted-text">선택된 파이프라인 로그가 없습니다.</li> : null}
          {selectedLogs.slice(0, 18).map((log) => {
            const signals = qualitySignals(log);
            return (
              <li key={`${log.pipeline_id}-${log.id ?? log.created_at}-${log.stage}`}>
                <span className={`status-chip tone-${statusTone(log.status)}`}>{STATUS_LABELS[log.status]}</span>
                <div className="activity-main">
                  <strong>{STAGE_LABELS[log.stage]}</strong> · {compactMessage(log.message)}
                  {(signals.fatal > 0 || signals.warning > 0) && (
                    <span className="activity-metrics">
                      치명 {signals.fatal} · 경고 {signals.warning}
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
            </article>
          );
        })}
      </section>
    </section>
  );
}
