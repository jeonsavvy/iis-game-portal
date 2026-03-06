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

export type RunStatus = "idle" | "queued" | "retrying" | "running" | "succeeded" | "failed" | "cancelled";

type AgentLogPanelProps = {
  activities: AgentActivity[];
  runStatus: RunStatus;
  runId?: string | null;
  runError?: string | null;
  isOpen: boolean;
  onToggle: () => void;
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
  retrying: "재시도 예정",
  running: "실행 중",
  succeeded: "완료",
  failed: "실패",
  cancelled: "취소됨",
};

function uniqueAgents(activities: AgentActivity[]): string[] {
  return Array.from(new Set(activities.map((act) => AGENT_LABELS[act.agent] ?? act.agent)));
}

function latestActivity(activities: AgentActivity[]): AgentActivity | null {
  return activities.length > 0 ? activities[activities.length - 1] : null;
}

export function AgentLogPanel({
  activities,
  runStatus,
  runId,
  runError,
  isOpen,
  onToggle,
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
  const latest = latestActivity(activities);

  return (
    <aside className={`editor-agent-panel ${isOpen ? "editor-agent-panel--open" : "editor-agent-panel--collapsed"}`}>
      <button type="button" className="editor-agent-toggle" onClick={onToggle} aria-expanded={isOpen}>
        <span className="editor-agent-toggle-icon">🧠</span>
        {isOpen ? <span className="editor-agent-toggle-label">에이전트 로그</span> : null}
        <span className={`editor-run-status editor-run-status--${runStatus}`}>{RUN_LABELS[runStatus]}</span>
      </button>

      {isOpen ? <div className="editor-agent-list">
        <div className="editor-agent-intro">
          <strong>🧠 진단 레일</strong>
          <p>실제 작업 흐름은 왼쪽 채팅 타임라인에 통합되고, 이 패널은 디버그/재시도용 상세 영역입니다.</p>
          {runId ? <p>실행 ID: {runId}</p> : null}
          {activeAgents.length > 0 ? <p>활동: {activeAgents.join(" · ")}</p> : null}
          {runError ? <p className="editor-agent-error">오류: {runError}</p> : null}
          {typeof latest?.metadata?.scaffold_key === "string" ? <p>기반 scaffold: {latest.metadata.scaffold_key as string}</p> : null}
          {typeof latest?.metadata?.generation_mode === "string" ? <p>생성 모드: {latest.metadata.generation_mode as string}</p> : null}
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

        {latest ? (
          <div className="editor-agent-item">
            <div className="editor-agent-item-head">
              <span>{AGENT_ICONS[latest.agent] ?? "🔧"}</span>
              <strong>{AGENT_LABELS[latest.agent] ?? latest.agent}</strong>
              <span className="editor-agent-action">{ACTION_LABELS[latest.action] ?? latest.action}</span>
            </div>
            {latest.summary ? <p className="editor-agent-summary">{latest.summary}</p> : null}
            {latest.input_signal ? <p className="editor-agent-summary">입력 신호: {latest.input_signal}</p> : null}
            {latest.decision_reason ? <p className="editor-agent-summary">판단 근거: {latest.decision_reason}</p> : null}
            {latest.change_impact ? <p className="editor-agent-summary">변경 영향: {latest.change_impact}</p> : null}
            {typeof latest.confidence === "number" ? (
              <p className="editor-agent-summary">신뢰도: {latest.confidence.toFixed(2)}</p>
            ) : null}
            {latest.error_code ? <p className="editor-agent-summary">오류 코드: {latest.error_code}</p> : null}
          </div>
        ) : (
          <p className="editor-agent-empty">프롬프트를 보내면 상세 진단이 여기에 표시됩니다.</p>
        )}
      </div> : null}
    </aside>
  );
}
