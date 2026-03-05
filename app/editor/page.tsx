"use client";

import { useCallback, useState } from "react";
import { ChatPanel, type ChatMessage } from "@/components/editor/ChatPanel";
import { GamePreview } from "@/components/editor/GamePreview";
import { AgentLogPanel, type AgentActivity } from "@/components/editor/AgentLogPanel";

type SessionState = {
    id: string;
    html: string;
    score: number;
    messages: ChatMessage[];
    activities: AgentActivity[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";

let msgCounter = 0;
function makeId() {
    return `msg-${Date.now()}-${++msgCounter}`;
}

export default function EditorSessionPage() {
    const [session, setSession] = useState<SessionState | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [agentPanelOpen, setAgentPanelOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ensureSession = useCallback(async (): Promise<string> => {
        if (session?.id) return session.id;

        const res = await fetch(`${API_BASE}/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New Game" }),
        });
        if (!res.ok) throw new Error("세션 생성 실패");
        const data = await res.json();
        const newId = data.session_id;
        setSession({
            id: newId,
            html: "",
            score: 0,
            messages: [],
            activities: [],
        });
        return newId;
    }, [session]);

    const handleSend = useCallback(
        async (prompt: string) => {
            setIsGenerating(true);
            setError(null);

            try {
                const sessionId = await ensureSession();

                // Add user message
                const userMsg: ChatMessage = {
                    id: makeId(),
                    role: "user",
                    content: prompt,
                    timestamp: Date.now(),
                };

                setSession((prev) => {
                    if (!prev) return prev;
                    return { ...prev, messages: [...prev.messages, userMsg] };
                });

                // Send prompt
                const res = await fetch(`${API_BASE}/sessions/${sessionId}/prompt`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt, auto_qa: true, stream: false }),
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`생성 실패: ${errorText.slice(0, 200)}`);
                }

                const result = await res.json();

                const assistantMsg: ChatMessage = {
                    id: makeId(),
                    role: "assistant",
                    content: result.error
                        ? `❌ 오류: ${result.error}`
                        : `✅ 게임이 ${result.auto_refined ? "자동 개선되어 " : ""}생성되었습니다! (점수: ${result.score}/100)`,
                    timestamp: Date.now(),
                };

                // Add QA feedback messages
                const feedbackMsgs: ChatMessage[] = (result.activities ?? [])
                    .filter((a: AgentActivity) => (a.agent === "visual_qa" || a.agent === "playtester") && a.summary)
                    .map((a: AgentActivity) => ({
                        id: makeId(),
                        role: a.agent as ChatMessage["role"],
                        content: `[${a.action}] ${a.summary}`,
                        timestamp: Date.now(),
                    }));

                setSession((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        html: result.html || prev.html,
                        score: result.score ?? prev.score,
                        messages: [...prev.messages, assistantMsg, ...feedbackMsgs],
                        activities: result.activities ?? prev.activities,
                    };
                });
            } catch (err) {
                const msg = err instanceof Error ? err.message : "알 수 없는 오류";
                setError(msg);
                setSession((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        messages: [
                            ...prev.messages,
                            {
                                id: makeId(),
                                role: "system",
                                content: `⚠️ ${msg}`,
                                timestamp: Date.now(),
                            },
                        ],
                    };
                });
            } finally {
                setIsGenerating(false);
            }
        },
        [ensureSession],
    );

    const handlePublish = useCallback(async () => {
        if (!session?.id || !session.html.trim()) return;
        setIsGenerating(true);
        try {
            const res = await fetch(`${API_BASE}/sessions/${session.id}/publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const result = await res.json();
            const msg: ChatMessage = {
                id: makeId(),
                role: "system",
                content: result.success
                    ? `🎉 게임이 출시되었습니다! → ${result.game_url}`
                    : `❌ 출시 실패: ${result.error}`,
                timestamp: Date.now(),
            };
            setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, msg] } : prev));
        } finally {
            setIsGenerating(false);
        }
    }, [session]);

    return (
        <div className="editor-layout">
            <header className="editor-header">
                <h2>🛠️ 게임 에디터</h2>
                <div className="editor-header-actions">
                    {session?.score ? <span className="editor-score">점수: {session.score}/100</span> : null}
                    <button
                        type="button"
                        className="button button-primary"
                        disabled={!session?.html.trim() || isGenerating}
                        onClick={handlePublish}
                    >
                        🚀 출시하기
                    </button>
                </div>
            </header>

            {error && (
                <div className="editor-error">
                    <p>{error}</p>
                    <button type="button" onClick={() => setError(null)}>
                        닫기
                    </button>
                </div>
            )}

            <div className="editor-workspace">
                <ChatPanel messages={session?.messages ?? []} onSend={handleSend} isGenerating={isGenerating} />
                <GamePreview html={session?.html ?? ""} />
                <AgentLogPanel
                    activities={session?.activities ?? []}
                    isOpen={agentPanelOpen}
                    onToggle={() => setAgentPanelOpen(!agentPanelOpen)}
                />
            </div>
        </div>
    );
}
