"use client";

export type AgentActivity = {
  agent: string;
  action: string;
  summary: string;
  score: number;
  decision_reason?: string;
  input_signal?: string;
  change_impact?: string;
  confidence?: number;
  error_code?: string | null;
  before_score?: number | null;
  after_score?: number | null;
  metadata?: Record<string, unknown>;
};

export type RunStatus = "idle" | "queued" | "running" | "succeeded" | "failed" | "cancelled";

type AgentLogPanelProps = {
  activities: AgentActivity[];
  runStatus: RunStatus;
  runId?: string | null;
  runError?: string | null;
  isBusy?: boolean;
  onCancelRun?: () => void;
  onRetryLast?: () => void;
  onRerunQa?: () => void;
  onRestorePrevious?: () => void;
  onProposeFix?: () => void;
  onApplyFix?: () => void;
  issueBusy?: boolean;
  canProposeFix?: boolean;
  canApplyFix?: boolean;
};

const AGENT_ICONS: Record<string, string> = {
  codegen: "⚡",
  visual_qa: "👁️",
  playtester: "🎮",
};

const AGENT_LABELS: Record<string, string> = {
  codegen: "코드젠",
  visual_qa: "비주얼 QA",
  playtester: "플레이테스터",
};

const ACTION_LABELS: Record<string, string> = {
  generate: "생성",
  modify: "수정",
  evaluate: "평가",
  test: "테스트",
  refine: "개선",
  run: "실행",
  audit: "감사",
};

const RUN_LABELS: Record<RunStatus, string> = {
  idle: "대기",
  queued: "대기열",
  running: "실행 중",
  succeeded: "완료",
  failed: "실패",
  cancelled: "취소됨",
};

function uniqueAgents(activities: AgentActivity[]): string[] {
  return Array.from(new Set(activities.map((act) => AGENT_LABELS[act.agent] ?? act.agent)));
}

export function AgentLogPanel({
  activities,
  runStatus,
  runId,
  runError,
  isBusy,
  onCancelRun,
  onRetryLast,
  onRerunQa,
  onRestorePrevious,
  onProposeFix,
  onApplyFix,
  issueBusy,
  canProposeFix,
  canApplyFix,
}: AgentLogPanelProps) {
  const activeAgents = uniqueAgents(activities);

  return (
    <aside className="editor-agent-panel editor-agent-panel--open">
      <div className="editor-agent-toggle editor-agent-toggle--locked">
        <span className="editor-agent-toggle-icon">🧠</span>
        <span className="editor-agent-toggle-label">에이전트 로그</span>
        <span className={`editor-run-status editor-run-status--${runStatus}`}>{RUN_LABELS[runStatus]}</span>
      </div>

      <div className="editor-agent-list">
        <div className="editor-agent-intro">
          <strong>🧠 에이전트 타임라인</strong>
          <p>채팅창 요청을 해석해 Codegen → Visual QA → Playtester 순서로 작업합니다.</p>
          {runId ? <p>실행 ID: {runId}</p> : null}
          {activeAgents.length > 0 ? <p>활동: {activeAgents.join(" · ")}</p> : null}
          {runError ? <p className="editor-agent-error">오류: {runError}</p> : null}
        </div>

        <div className="editor-agent-actions">
          <button type="button" onClick={onRetryLast} disabled={isBusy || !onRetryLast}>
            마지막 요청 재실행
          </button>
          <button type="button" onClick={onRerunQa} disabled={isBusy || !onRerunQa}>
            QA만 다시 실행
          </button>
          <button type="button" onClick={onRestorePrevious} disabled={isBusy || !onRestorePrevious}>
            직전 결과 복원
          </button>
        </div>

        <div className="editor-agent-actions">
          <button type="button" onClick={onCancelRun} disabled={!onCancelRun || runStatus !== "running"}>
            실행 취소
          </button>
          <button type="button" onClick={onProposeFix} disabled={Boolean(issueBusy) || !canProposeFix || !onProposeFix}>
            수정안 다시 생성
          </button>
          <button type="button" onClick={onApplyFix} disabled={Boolean(issueBusy) || !canApplyFix || !onApplyFix}>
            수정안 적용
          </button>
        </div>

        {activities.length === 0 ? (
          <p className="editor-agent-empty">프롬프트를 보내면 에이전트 단계별 판단이 표시됩니다.</p>
        ) : (
          activities.map((act, idx) => (
            <div key={idx} className="editor-agent-item">
              <div className="editor-agent-item-head">
                <span>{AGENT_ICONS[act.agent] ?? "🔧"}</span>
                <strong>{AGENT_LABELS[act.agent] ?? act.agent}</strong>
                <span className="editor-agent-action">{ACTION_LABELS[act.action] ?? act.action}</span>
              </div>
              {act.summary && <p className="editor-agent-summary">{act.summary}</p>}
              {act.input_signal ? <p className="editor-agent-summary">입력 신호: {act.input_signal}</p> : null}
              {act.decision_reason ? <p className="editor-agent-summary">판단 근거: {act.decision_reason}</p> : null}
              {act.change_impact ? <p className="editor-agent-summary">변경 영향: {act.change_impact}</p> : null}
              {typeof act.metadata?.scaffold_key === "string" ? (
                <p className="editor-agent-summary">기반 scaffold: {act.metadata.scaffold_key as string}</p>
              ) : null}
              {typeof act.metadata?.generation_mode === "string" ? (
                <p className="editor-agent-summary">생성 모드: {act.metadata.generation_mode as string}</p>
              ) : null}
              {typeof act.confidence === "number" ? (
                <p className="editor-agent-summary">신뢰도: {act.confidence.toFixed(2)}</p>
              ) : null}
              {act.error_code ? <p className="editor-agent-summary">오류 코드: {act.error_code}</p> : null}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
