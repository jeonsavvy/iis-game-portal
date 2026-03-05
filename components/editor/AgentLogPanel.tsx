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
};

export type RunStatus = "idle" | "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type IssueCategory = "gameplay" | "visual" | "runtime";

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
  issueDraft: string;
  issueCategory: IssueCategory;
  onIssueDraftChange: (value: string) => void;
  onIssueCategoryChange: (value: IssueCategory) => void;
  onReportIssue?: () => void;
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
  codegen: "Codegen",
  visual_qa: "Visual QA",
  playtester: "Playtester",
};

const ACTION_LABELS: Record<string, string> = {
  generate: "생성",
  modify: "수정",
  evaluate: "평가",
  test: "테스트",
  refine: "개선",
  run: "run",
  audit: "audit",
};

const RUN_LABELS: Record<RunStatus, string> = {
  idle: "대기",
  queued: "queued",
  running: "running",
  succeeded: "succeeded",
  failed: "failed",
  cancelled: "cancelled",
};

function deltaLabel(activity: AgentActivity): string | null {
  if (typeof activity.before_score !== "number" || typeof activity.after_score !== "number") {
    return null;
  }
  return `${activity.before_score} → ${activity.after_score}`;
}

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
  issueDraft,
  issueCategory,
  onIssueDraftChange,
  onIssueCategoryChange,
  onReportIssue,
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
          <strong>🕹 멀티에이전트 타임라인</strong>
          <p>Loop: Codegen → Visual QA → Playtester</p>
          {runId ? <p>run_id: {runId}</p> : null}
          {activeAgents.length > 0 ? <p>활동: {activeAgents.join(" · ")}</p> : null}
          {runError ? <p className="editor-agent-error">error: {runError}</p> : null}
        </div>

        <div className="editor-agent-actions">
          <button type="button" onClick={onRetryLast} disabled={isBusy || !onRetryLast}>
            재시도
          </button>
          <button type="button" onClick={onRerunQa} disabled={isBusy || !onRerunQa}>
            QA 재실행
          </button>
          <button type="button" onClick={onRestorePrevious} disabled={isBusy || !onRestorePrevious}>
            직전 복원
          </button>
        </div>

        <div className="editor-agent-actions">
          <button type="button" onClick={onCancelRun} disabled={!onCancelRun || runStatus !== "running"}>
            Run 취소
          </button>
          <button type="button" onClick={onProposeFix} disabled={Boolean(issueBusy) || !canProposeFix || !onProposeFix}>
            수정안 생성
          </button>
          <button type="button" onClick={onApplyFix} disabled={Boolean(issueBusy) || !canApplyFix || !onApplyFix}>
            수정안 적용
          </button>
        </div>

        <div className="editor-agent-issue-box">
          <label htmlFor="issue-category">협업 수정 라우팅</label>
          <select
            id="issue-category"
            value={issueCategory}
            onChange={(event) => onIssueCategoryChange(event.target.value as IssueCategory)}
            disabled={Boolean(issueBusy)}
          >
            <option value="gameplay">gameplay / physics</option>
            <option value="visual">visual / readability</option>
            <option value="runtime">runtime / bug</option>
          </select>
          <textarea
            value={issueDraft}
            onChange={(event) => onIssueDraftChange(event.target.value)}
            placeholder="예: 코너링 감각이 이상해. 차량 조향을 안정적으로 조정해줘."
            rows={3}
            disabled={Boolean(issueBusy)}
          />
          <button type="button" onClick={onReportIssue} disabled={Boolean(issueBusy) || !issueDraft.trim() || !onReportIssue}>
            사람 피드백 등록
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
                {act.score > 0 && <span className="editor-agent-score">{act.score}점</span>}
                {deltaLabel(act) && <span className="editor-agent-score">{deltaLabel(act)}</span>}
              </div>
              {act.summary && <p className="editor-agent-summary">{act.summary}</p>}
              {act.input_signal ? <p className="editor-agent-summary">input: {act.input_signal}</p> : null}
              {act.decision_reason ? <p className="editor-agent-summary">why: {act.decision_reason}</p> : null}
              {act.change_impact ? <p className="editor-agent-summary">impact: {act.change_impact}</p> : null}
              {typeof act.confidence === "number" ? (
                <p className="editor-agent-summary">confidence: {act.confidence.toFixed(2)}</p>
              ) : null}
              {act.error_code ? <p className="editor-agent-summary">error_code: {act.error_code}</p> : null}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
