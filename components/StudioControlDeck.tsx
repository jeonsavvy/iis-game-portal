"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";

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
  { stage: "trigger", role: "디렉터", title: "Scout", gridColumn: 1, gridRow: 1, icon: "scout" },
  { stage: "plan", role: "아키텍트", title: "Intel", gridColumn: 2, gridRow: 1, icon: "intel" },
  { stage: "build", role: "빌더", title: "Builder", gridColumn: 3, gridRow: 1, icon: "builder" },
  { stage: "style", role: "스타일리스트", title: "Stylist", gridColumn: 1, gridRow: 2, icon: "stylist" },
  { stage: "qa", role: "센티널", title: "Sentinel", gridColumn: 2, gridRow: 2, icon: "sentinel" },
  { stage: "publish", role: "퍼블리셔", title: "Outreach", gridColumn: 3, gridRow: 2, icon: "publisher" },
  { stage: "echo", role: "에코", title: "Closer", gridColumn: 2, gridRow: 3, icon: "echo" },
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

const STAGE_GUIDE: Record<
  Exclude<PipelineStage, "done">,
  {
    summary: string;
    handoff: string;
    focus: string;
  }
> = {
  trigger: {
    summary: "유저 키워드를 해석해 목표 장르/톤/제약을 확정합니다.",
    handoff: "기획 브리프를 Architect로 전달",
    focus: "입력 품질, 금칙어, 목적 정렬",
  },
  plan: {
    summary: "기획서/레퍼런스/구현 범위를 결정합니다.",
    handoff: "스타일 시스템 요구사항을 Stylist로 전달",
    focus: "요구사항 정확도, 범위 잠금",
  },
  style: {
    summary: "디자인 토큰과 컴포넌트 계약을 생성합니다.",
    handoff: "빌드 가능한 스타일 규격을 Builder에 전달",
    focus: "시각 일관성, 컴포넌트 계약",
  },
  build: {
    summary: "게임 아티팩트와 UI 코드를 빌드합니다.",
    handoff: "검증 가능한 산출물을 Sentinel에 전달",
    focus: "실행 가능 산출물, 의존성 무결성",
  },
  qa: {
    summary: "플레이 테스트, 품질 게이트, 스크린샷 검수를 수행합니다.",
    handoff: "게시 승인 패키지를 Publisher로 전달",
    focus: "결함 검출, 재시도 필요성",
  },
  publish: {
    summary: "배포/스토리지/아카이브를 동기화합니다.",
    handoff: "최종 공지 컨텍스트를 Echo에 전달",
    focus: "배포 상태, 링크 유효성",
  },
  echo: {
    summary: "최종 결과를 공지하고 운영 채널에 상태를 남깁니다.",
    handoff: "파이프라인 종료 보고",
    focus: "커뮤니케이션 완결성",
  },
};

const MOBILE_TABS = [
  { key: "board", label: "협업보드" },
  { key: "activity", label: "라이브로그" },
  { key: "control", label: "실행/승인" },
] as const;

function statusTone(status: PipelineStatus | null): "success" | "error" | "running" | "warn" | "idle" | "muted" {
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
  if (normalized.length <= 86) return normalized;
  return `${normalized.slice(0, 86)}…`;
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

export function StudioControlDeck({ initialLogs, previewMode = false }: { initialLogs: PipelineLog[]; previewMode?: boolean }) {
  const [logs, setLogs] = useState<PipelineLog[]>(initialLogs);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(initialLogs[0]?.pipeline_id ?? null);
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [busyAction, setBusyAction] = useState<PipelineControlAction | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [pollMode, setPollMode] = useState<"idle" | "polling">("idle");
  const [mobileTab, setMobileTab] = useState<(typeof MOBILE_TABS)[number]["key"]>("board");
  const [selectedStage, setSelectedStage] = useState<Exclude<PipelineStage, "done">>("trigger");
  const [agentPresenceEnabled, setAgentPresenceEnabled] = useState(true);

  useEffect(() => {
    if (previewMode) {
      return;
    }

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
  }, [pollMode, previewMode]);

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

  useEffect(() => {
    const waitingStage = pipelineSummary?.waiting_for_stage;
    if (waitingStage && waitingStage !== "done") {
      setSelectedStage(waitingStage);
      return;
    }

    const firstExisting = AGENT_LAYOUT.find((agent) => latestStageMap.has(agent.stage));
    if (firstExisting) {
      setSelectedStage(firstExisting.stage);
    }
  }, [pipelineSummary?.waiting_for_stage, latestStageMap]);

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

  const selectedStageLog = latestStageMap.get(selectedStage) ?? null;
  const selectedAgent = AGENT_LAYOUT.find((item) => item.stage === selectedStage) ?? AGENT_LAYOUT[0];
  const selectedSignals = qualitySignals(selectedStageLog);

  const recentFailures = useMemo(
    () => selectedLogs.filter((log) => log.status === "error" || log.status === "retry").slice(0, 6),
    [selectedLogs],
  );

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
      const payload = (await response.json().catch(() => null)) as PipelineSummary | { error?: string; detail?: string } | null;
      if (!response.ok) {
        setPipelineSummary(null);
        setFeedback(
          `상태 조회 실패: ${(payload as { detail?: string; error?: string } | null)?.detail ?? (payload as { error?: string } | null)?.error ?? "unknown_error"}`,
        );
        return;
      }
      setPipelineSummary(payload as PipelineSummary);
    },
    [previewMode, logs],
  );

  useEffect(() => {
    void refreshSummary(selectedPipelineId);
  }, [selectedPipelineId, refreshSummary]);

  const runControl = async (action: PipelineControlAction) => {
    if (!selectedPipelineId) {
      setFeedback("파이프라인을 먼저 선택해주세요.");
      return;
    }

    if (previewMode) {
      setFeedback(`[프리뷰] ${CONTROL_LABELS[action]} 시뮬레이션 완료`);
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
      setFeedback(
        `${CONTROL_LABELS[action]} 완료 · 상태=${STATUS_LABELS[typed.status]} · 대기단계=${typed.waiting_for_stage ? STAGE_LABELS[typed.waiting_for_stage] : "-"}`,
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

  return (
    <section className={`ops-console-deck${agentPresenceEnabled ? "" : " agent-presence-off"}`}>
      <section className="surface ops-command-head">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">Ops Command</p>
            <h3 className="section-title">멀티 에이전트 협업 관제</h3>
            <p className="section-subtitle">한 파이프라인의 협업 흐름을 추적하고, 필요한 순간에 즉시 제어합니다.</p>
          </div>
          <div className="ops-status-strip">
            <span className="status-chip tone-running">running {globalStatus.running}</span>
            {globalStatus.retry > 0 ? <span className="status-chip tone-warn">retry {globalStatus.retry}</span> : null}
            {globalStatus.error > 0 ? <span className="status-chip tone-error">error {globalStatus.error}</span> : null}
            <span className="status-chip tone-success">success {globalStatus.success}</span>
            {pollMode === "polling" ? <span className="status-chip tone-warn">polling</span> : null}
            <button
              type="button"
              className="button button-ghost ops-agent-toggle"
              onClick={() => setAgentPresenceEnabled((prev) => !prev)}
            >
              연출 레이어 {agentPresenceEnabled ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        <div className="ops-command-grid">
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

          <div className="ops-command-buttons">
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

        <div className="ops-context-tags">
          <span className="terminal-tag">pipeline: {selectedPipelineId ? selectedPipelineId.slice(0, 12) : "-"}</span>
          {pipelineSummary?.status ? <span className="terminal-tag subtle">status: {STATUS_LABELS[pipelineSummary.status]}</span> : null}
          {pipelineSummary?.execution_mode ? (
            <span className="terminal-tag subtle">mode: {pipelineSummary.execution_mode}</span>
          ) : null}
          {pipelineSummary?.waiting_for_stage ? (
            <span className="terminal-tag subtle">waiting: {STAGE_LABELS[pipelineSummary.waiting_for_stage]}</span>
          ) : null}
        </div>

        {feedback ? <p className="inline-feedback">{feedback}</p> : null}

        <div className="ops-mobile-tabs">
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

      <section className={`surface ops-main-layout ops-pane ${mobileTab === "board" ? "is-active" : ""}`}>
        <div className="ops-main-grid">
          <section className="ops-collab-graph">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">Collab Graph</p>
                <h3 className="section-title">에이전트 작업대</h3>
              </div>
              <div className="ops-counters">
                <span>
                  <strong>{telemetry.found}</strong>
                  <small>기획</small>
                </span>
                <span>
                  <strong>{telemetry.built}</strong>
                  <small>빌드</small>
                </span>
                <span>
                  <strong>{telemetry.sent}</strong>
                  <small>게시</small>
                </span>
                <span>
                  <strong>{telemetry.replied}</strong>
                  <small>공유</small>
                </span>
              </div>
            </div>

            <div className="ops-graph-canvas">
              <svg className="ops-graph-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path d="M17 16 L50 16 L83 16" />
                <path d="M17 16 L17 50 L50 50 L83 50" />
                <path d="M50 16 L50 50" />
                <path d="M83 16 L83 50 L50 82" />
              </svg>

              <div className="ops-node-grid">
                {AGENT_LAYOUT.map((agent) => {
                  const stageLog = latestStageMap.get(agent.stage) ?? null;
                  const tone = statusTone(stageLog?.status ?? null);
                  const waiting = pipelineSummary?.waiting_for_stage === agent.stage;
                  const active = stageLog?.status === "running" || waiting;
                  const signals = qualitySignals(stageLog);
                  const selected = selectedStage === agent.stage;

                  return (
                    <button
                      type="button"
                      key={agent.stage}
                      className={`ops-node tone-${tone}${waiting ? " waiting" : ""}${active ? " is-live" : ""}${selected ? " is-selected" : ""}`}
                      style={{ gridColumn: `${agent.gridColumn} / span 1`, gridRow: `${agent.gridRow} / span 1` }}
                      onClick={() => setSelectedStage(agent.stage)}
                    >
                      <div className="ops-node-top">
                        {agentPresenceEnabled ? <AgentGlyph icon={agent.icon} tone={tone} active={active} /> : null}
                        <div>
                          <p>{agent.role}</p>
                          <h4>{agent.title}</h4>
                        </div>
                      </div>
                      <p className="ops-node-message">{compactMessage(stageLog?.message ?? (waiting ? "승인 대기중" : "유휴"))}</p>
                      <div className="ops-node-foot">
                        <span className={`status-chip tone-${tone}`}>{stageLog ? STATUS_LABELS[stageLog.status] : waiting ? "대기" : "유휴"}</span>
                        <span>{stageLog ? new Date(stageLog.created_at).toLocaleTimeString() : "-"}</span>
                      </div>
                      {(signals.fatal > 0 || signals.warning > 0) && (
                        <p className="ops-node-signal">
                          치명 {signals.fatal} · 경고 {signals.warning}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="ops-workbench">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">Workbench</p>
                <h3 className="section-title">{STAGE_LABELS[selectedStage]} 작업 상세</h3>
              </div>
              {agentPresenceEnabled ? (
                <AgentGlyph
                  icon={selectedAgent.icon}
                  tone={statusTone(selectedStageLog?.status ?? null)}
                  active={selectedStageLog?.status === "running" || pipelineSummary?.waiting_for_stage === selectedStage}
                />
              ) : null}
            </div>

            <div className="ops-workbench-card">
              <p>{STAGE_GUIDE[selectedStage].summary}</p>
              <ul className="bullet-list compact">
                <li>
                  <strong>핵심 포커스:</strong> {STAGE_GUIDE[selectedStage].focus}
                </li>
                <li>
                  <strong>핸드오프:</strong> {STAGE_GUIDE[selectedStage].handoff}
                </li>
                <li>
                  <strong>최신 메시지:</strong> {compactMessage(selectedStageLog?.message)}
                </li>
              </ul>
            </div>

            <div className="ops-workbench-meta">
              <span className={`status-chip tone-${statusTone(selectedStageLog?.status ?? null)}`}>
                {selectedStageLog ? STATUS_LABELS[selectedStageLog.status] : "유휴"}
              </span>
              {selectedSignals.fatal > 0 ? <span className="terminal-tag subtle">fatal {selectedSignals.fatal}</span> : null}
              {selectedSignals.warning > 0 ? <span className="terminal-tag subtle">warning {selectedSignals.warning}</span> : null}
              <span className="terminal-tag subtle">
                updated {selectedStageLog ? new Date(selectedStageLog.created_at).toLocaleTimeString() : "-"}
              </span>
            </div>

            <div className="ops-workbench-actions">
              <button className="button button-ghost" type="button" onClick={() => void runControl("pause")} disabled={!selectedPipelineId || busyAction !== null}>
                일시정지
              </button>
              <button className="button button-primary" type="button" onClick={() => void runControl("resume")} disabled={!selectedPipelineId || busyAction !== null}>
                재개
              </button>
              <button className="button button-danger" type="button" onClick={() => void runControl("cancel")} disabled={!selectedPipelineId || busyAction !== null}>
                중단
              </button>
              <button className="button button-ghost" type="button" onClick={() => void runControl("retry")} disabled={!selectedPipelineId || busyAction !== null}>
                재시도
              </button>
            </div>
          </section>

          <aside className="ops-live-log">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">Live Rail</p>
                <h3 className="section-title">실시간 로그</h3>
              </div>
              <span className="muted-text">{selectedLogs.length} logs</span>
            </div>

            <ul className="ops-log-list">
              {selectedLogs.length === 0 ? <li className="muted-text">선택된 파이프라인 로그가 없습니다.</li> : null}
              {selectedLogs.slice(0, 26).map((log) => {
                const tone = statusTone(log.status);
                const signals = qualitySignals(log);
                const icon = AGENT_LAYOUT.find((item) => item.stage === log.stage)?.icon ?? "scout";
                return (
                  <li key={`${log.pipeline_id}-${log.id ?? log.created_at}-${log.stage}`} className={`ops-log-item tone-${tone}${agentPresenceEnabled ? "" : " no-agent"}`}>
                    {agentPresenceEnabled ? <AgentGlyph icon={icon} tone={tone} active={log.status === "running"} /> : null}
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
                    <div className="ops-log-item-meta">
                      <span className={`status-chip tone-${tone}`}>{STATUS_LABELS[log.status]}</span>
                      <time>{new Date(log.created_at).toLocaleTimeString()}</time>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </section>

      <section className={`surface ops-mobile-log-pane ops-pane ${mobileTab === "activity" ? "is-active" : ""}`}>
        <div className="section-head compact">
          <div>
            <p className="eyebrow">Activity</p>
            <h3 className="section-title">모바일 이벤트 피드</h3>
          </div>
          <span className="muted-text">{selectedLogs.length}개 로그</span>
        </div>
        <ul className="activity-list">
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

      <section className={`surface ops-utility-shell ops-pane ${mobileTab === "control" ? "is-active" : ""}`}>
        <div className="ops-utility-grid">
          {previewMode ? (
            <article className="surface form-panel ops-utility-card">
              <div className="section-head compact">
                <div>
                  <p className="eyebrow">Preview</p>
                  <h3 className="section-title">실행/승인 시뮬레이션</h3>
                </div>
              </div>
              <p className="muted-text">프리뷰 모드에서는 실제 트리거/승인 요청을 전송하지 않습니다.</p>
              <p className="inline-feedback">상단 제어 버튼은 시뮬레이션 피드백만 제공합니다.</p>
            </article>
          ) : (
            <>
              <TriggerForm
                className="ops-utility-card"
                onTriggered={(item) => {
                  setSelectedPipelineId(item.pipelineId);
                  setFeedback(`신규 파이프라인 등록: ${item.pipelineId}`);
                }}
              />

              <ManualApprovalForm
                className="ops-utility-card"
                defaultPipelineId={selectedPipelineId ?? undefined}
                onApproved={({ pipelineId }) => {
                  setSelectedPipelineId(pipelineId);
                  void refreshSummary(pipelineId);
                }}
              />
            </>
          )}

          <article className="surface form-panel ops-utility-card">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">Failure Focus</p>
                <h3 className="section-title">최근 실패 원인</h3>
              </div>
            </div>

            {recentFailures.length === 0 ? (
              <p className="muted-text">최근 실패가 없습니다.</p>
            ) : (
              <ul className="bullet-list compact">
                {recentFailures.map((log) => (
                  <li key={`${log.pipeline_id}-${log.id ?? log.created_at}-failure`}>
                    <strong>{STAGE_LABELS[log.stage]}:</strong> {compactMessage(log.reason ?? log.message)}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="surface form-panel ops-utility-card">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">Pipeline Utility</p>
                <h3 className="section-title">배포/아카이브 상태</h3>
              </div>
            </div>

            <ul className="bullet-list compact">
              <li>
                <strong>현재 파이프라인:</strong> {selectedPipelineId ? selectedPipelineId.slice(0, 12) : "-"}
              </li>
              <li>
                <strong>실행 모드:</strong> {pipelineSummary?.execution_mode ?? "-"}
              </li>
              <li>
                <strong>대기 단계:</strong> {pipelineSummary?.waiting_for_stage ? STAGE_LABELS[pipelineSummary.waiting_for_stage] : "-"}
              </li>
              <li>
                <strong>최근 상태:</strong> {pipelineSummary?.status ? STATUS_LABELS[pipelineSummary.status] : "-"}
              </li>
            </ul>
          </article>
        </div>
      </section>
    </section>
  );
}
