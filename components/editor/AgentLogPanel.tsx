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

type AgentLogPanelProps = {
  activities: AgentActivity[];
  isOpen: boolean;
  onToggle?: () => void;
  lockOpen?: boolean;
  onRetryLast?: () => void;
  onRerunQa?: () => void;
  onRestorePrevious?: () => void;
  isBusy?: boolean;
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
  isOpen,
  onToggle,
  lockOpen,
  onRetryLast,
  onRerunQa,
  onRestorePrevious,
  isBusy,
}: AgentLogPanelProps) {
  const open = lockOpen ? true : isOpen;
  const activeAgents = uniqueAgents(activities);

  return (
    <aside className={`editor-agent-panel ${open ? "editor-agent-panel--open" : ""}`}>
      {lockOpen ? (
        <div className="editor-agent-toggle editor-agent-toggle--locked">
          <span className="editor-agent-toggle-icon">🧠</span>
          <span className="editor-agent-toggle-label">에이전트 로그</span>
          <span className="editor-agent-toggle-count">{activities.length}</span>
        </div>
      ) : (
        <button
          type="button"
          className="editor-agent-toggle"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? "에이전트 로그 접기" : "에이전트 로그 열기"}
          title={open ? "에이전트 로그 접기" : "에이전트 로그 열기"}
        >
          <span className="editor-agent-toggle-icon">{open ? "▸" : "◂"}</span>
          {open ? (
            <span className="editor-agent-toggle-label">에이전트 로그</span>
          ) : (
            <span className="editor-agent-toggle-count">{activities.length}</span>
          )}
        </button>
      )}

      {open && (
        <div className="editor-agent-list">
          <div className="editor-agent-intro">
            <strong>🧠 멀티에이전트 타임라인</strong>
            <p>Loop: Codegen → Visual QA → Playtester</p>
            {activeAgents.length > 0 ? <p>활동: {activeAgents.join(" · ")}</p> : null}
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
      )}
    </aside>
  );
}
