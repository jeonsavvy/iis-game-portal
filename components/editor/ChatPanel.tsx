"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

export type ChatAttachment = {
    name: string;
    mime_type: string;
    data_url?: string;
};

export type ChatMessage = {
    id: string;
    role: "user" | "assistant" | "visual_qa" | "playtester" | "system";
    content: string;
    timestamp: number;
    attachment?: ChatAttachment | null;
};

export type ChatSendPayload = {
    prompt: string;
    attachment?: ChatAttachment | null;
    mode?: "auto" | "generate" | "issue";
};

type ChatPanelProps = {
    messages: ChatMessage[];
    onSend: (payload: ChatSendPayload) => void;
    isGenerating: boolean;
};

const ROLE_LABELS: Record<ChatMessage["role"], string> = {
    user: "나",
    assistant: "코드젠",
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
    const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isGenerating) return;
        onSend({ prompt: trimmed, attachment });
        setInput("");
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
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

    const handlePickImage = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) return;
        if (file.size > 1_500_000) return;

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== "string") return;
            setAttachment({
                name: file.name,
                mime_type: file.type,
                data_url: reader.result,
            });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="editor-chat-panel">
            <div className="editor-chat-header">
                <h3>💬 게임 제작 채팅</h3>
            </div>

            <div className="editor-chat-messages" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="editor-chat-welcome">
                        <h4>🚀 무엇을 만들까요?</h4>
                        <p>왼쪽 채팅에서 요청하고, 오른쪽 프리뷰를 보며 바로 수정하세요. 진단 레일은 필요할 때만 열면 됩니다.</p>
                        <div className="editor-chat-suggestions">
                            <button type="button" onClick={() => onSend({ prompt: "오픈휠 레이스카로 서킷을 주행하며 랩타임을 기록하는 풀 3D 레이싱 게임 만들어줘" })} disabled={isGenerating}>
                                🏎️ 레이싱 게임
                            </button>
                            <button type="button" onClick={() => onSend({ prompt: "우주 도그파이트에 초점을 맞춘 풀 3D 플라이트 슈팅 게임 만들어줘" })} disabled={isGenerating}>
                                🚀 플라이트 슈팅 게임
                            </button>
                            <button type="button" onClick={() => onSend({ prompt: "트윈스틱 이동과 에임, 대시, 웨이브 전투가 있는 탑뷰 슈팅 게임 만들어줘" })} disabled={isGenerating}>
                                🔫 탑뷰 슈팅 게임
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
                            {msg.attachment ? (
                                msg.attachment.data_url ? (
                                    <Image
                                        src={msg.attachment.data_url}
                                        alt={msg.attachment.name}
                                        width={92}
                                        height={68}
                                        unoptimized
                                        className="editor-chat-attachment-preview"
                                    />
                                ) : (
                                    <div className="editor-chat-attachment-pill">📎 {msg.attachment.name}</div>
                                )
                            ) : null}
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
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: "none" }}
                    onChange={handlePickImage}
                />
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isGenerating ? "에이전트 루프 실행 중..." : "원하는 게임을 자세히 적어주세요... (Enter 전송 / Shift+Enter 줄바꿈)"}
                    disabled={isGenerating}
                    rows={2}
                />
                <div className="editor-chat-input-actions">
                    <button
                        type="button"
                        className="editor-chat-attach"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isGenerating}
                    >
                        이미지
                    </button>
                    {attachment ? (
                        <button
                            type="button"
                            className="editor-chat-attach editor-chat-attach--secondary"
                            onClick={() => {
                                setAttachment(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                        >
                            첨부 제거
                        </button>
                    ) : null}
                </div>
                <button type="submit" disabled={isGenerating || !input.trim()} className="editor-chat-send">
                    전송
                </button>
            </form>
            {attachment ? (
                <div className="editor-chat-attachment-draft">
                    {attachment.data_url ? <Image src={attachment.data_url} alt={attachment.name} width={92} height={68} unoptimized className="editor-chat-attachment-preview" /> : null}
                    <span>첨부 예정: {attachment.name}</span>
                </div>
            ) : null}
        </div>
    );
}
