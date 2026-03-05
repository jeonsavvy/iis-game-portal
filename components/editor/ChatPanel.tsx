"use client";

import { useRef, useState, type FormEvent } from "react";

export type ChatMessage = {
    id: string;
    role: "user" | "assistant" | "visual_qa" | "playtester" | "system";
    content: string;
    timestamp: number;
};

type ChatPanelProps = {
    messages: ChatMessage[];
    onSend: (prompt: string) => void;
    isGenerating: boolean;
};

const ROLE_LABELS: Record<ChatMessage["role"], string> = {
    user: "나",
    assistant: "Codegen",
    visual_qa: "시각 QA",
    playtester: "플레이테스터",
    system: "시스템",
};

const ROLE_ICONS: Record<ChatMessage["role"], string> = {
    user: "👤",
    assistant: "🤖",
    visual_qa: "👁️",
    playtester: "🎮",
    system: "⚙️",
};

export function ChatPanel({ messages, onSend, isGenerating }: ChatPanelProps) {
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isGenerating) return;
        onSend(trimmed);
        setInput("");
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // Auto-scroll to bottom
    const prevMsgCount = useRef(messages.length);
    if (messages.length !== prevMsgCount.current) {
        prevMsgCount.current = messages.length;
        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        });
    }

    return (
        <div className="editor-chat-panel">
            <div className="editor-chat-header">
                <h3>💬 게임 제작 채팅</h3>
            </div>

            <div className="editor-chat-messages" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="editor-chat-welcome">
                        <h4>🚀 무엇을 만들까요?</h4>
                        <p>요청을 보내면 Codegen · Visual QA · Playtester가 순서대로 결과를 다듬습니다.</p>
                        <div className="editor-chat-suggestions">
                            <button type="button" onClick={() => onSend("우주 슈팅 게임 만들어줘")} disabled={isGenerating}>
                                🚀 우주 슈팅 게임
                            </button>
                            <button type="button" onClick={() => onSend("3D 레이싱 게임 만들어줘")} disabled={isGenerating}>
                                🏎️ 3D 레이싱
                            </button>
                            <button type="button" onClick={() => onSend("좀비 서바이벌 게임 만들어줘")} disabled={isGenerating}>
                                🧟 좀비 서바이벌
                            </button>
                            <button type="button" onClick={() => onSend("퍼즐 플랫포머 게임 만들어줘")} disabled={isGenerating}>
                                🧩 퍼즐 플랫포머
                            </button>
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`editor-chat-msg editor-chat-msg--${msg.role}`}>
                            <div className="editor-chat-msg-meta">
                                <span className="editor-chat-msg-icon">{ROLE_ICONS[msg.role]}</span>
                                <span className="editor-chat-msg-role">{ROLE_LABELS[msg.role]}</span>
                            </div>
                            <div className="editor-chat-msg-body">{msg.content}</div>
                        </div>
                    ))
                )}

                {isGenerating && (
                    <div className="editor-chat-msg editor-chat-msg--assistant">
                        <div className="editor-chat-msg-meta">
                            <span className="editor-chat-msg-icon">🤖</span>
                            <span className="editor-chat-msg-role">멀티에이전트</span>
                        </div>
                        <div className="editor-chat-msg-body editor-chat-typing">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
            </div>

            <form className="editor-chat-input" onSubmit={handleSubmit}>
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isGenerating ? "에이전트 루프 실행 중..." : "원하는 게임을 자세히 적어주세요... (Enter 전송 / Shift+Enter 줄바꿈)"}
                    disabled={isGenerating}
                    rows={2}
                />
                <button type="submit" disabled={isGenerating || !input.trim()} className="editor-chat-send">
                    전송
                </button>
            </form>
        </div>
    );
}
