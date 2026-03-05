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
    onToggle: () => void;
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

export function AgentLogPanel({
    activities,
    isOpen,
    onToggle,
    onRetryLast,
    onRerunQa,
    onRestorePrevious,
    isBusy,
}: AgentLogPanelProps) {
    return (
        <div className={`editor-agent-panel ${isOpen ? "editor-agent-panel--open" : ""}`}>
            <button type="button" className="editor-agent-toggle" onClick={onToggle}>
                {isOpen ? "▸" : "◂"} 에이전트 로그 ({activities.length})
            </button>

            {isOpen && (
                <div className="editor-agent-list">
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
                        <p className="editor-agent-empty">아직 에이전트 활동이 없습니다</p>
                    ) : (
                        activities.map((act, idx) => (
                            <div key={idx} className="editor-agent-item">
                                <div className="editor-agent-item-head">
                                    <span>{AGENT_ICONS[act.agent] ?? "🔧"}</span>
                                    <strong>{act.agent}</strong>
                                    <span className="editor-agent-action">{ACTION_LABELS[act.action] ?? act.action}</span>
                                    {act.score > 0 && <span className="editor-agent-score">{act.score}점</span>}
                                    {deltaLabel(act) && <span className="editor-agent-score">{deltaLabel(act)}</span>}
                                </div>
                                {act.summary && <p className="editor-agent-summary">{act.summary}</p>}
                                {act.input_signal ? <p className="editor-agent-summary">input: {act.input_signal}</p> : null}
                                {act.decision_reason ? (
                                    <p className="editor-agent-summary">why: {act.decision_reason}</p>
                                ) : null}
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
        </div>
    );
}
