"use client";

export type AgentActivity = {
    agent: string;
    action: string;
    summary: string;
    score: number;
};

type AgentLogPanelProps = {
    activities: AgentActivity[];
    isOpen: boolean;
    onToggle: () => void;
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

export function AgentLogPanel({ activities, isOpen, onToggle }: AgentLogPanelProps) {
    return (
        <div className={`editor-agent-panel ${isOpen ? "editor-agent-panel--open" : ""}`}>
            <button type="button" className="editor-agent-toggle" onClick={onToggle}>
                {isOpen ? "▸" : "◂"} 에이전트 로그 ({activities.length})
            </button>

            {isOpen && (
                <div className="editor-agent-list">
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
                                </div>
                                {act.summary && <p className="editor-agent-summary">{act.summary}</p>}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
