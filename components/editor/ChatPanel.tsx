"use client";

import Image from "next/image";
import { ImagePlus, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { ChatAttachment, ChatMessage, ChatSendPayload } from "@/components/editor/types";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<ChatMessage["role"], string> = {
  user: "요청",
  assistant: "코드젠",
  visual_qa: "시각 QA",
  playtester: "플레이테스터",
  system: "시스템",
};

const ROLE_TONE: Record<ChatMessage["role"], string> = {
  user: "border-cyan-300/25 bg-cyan-300/8 text-cyan-50",
  assistant: "border-indigo-300/20 bg-indigo-300/8 text-indigo-50",
  visual_qa: "border-emerald-300/20 bg-emerald-300/8 text-emerald-50",
  playtester: "border-amber-300/20 bg-amber-300/8 text-amber-50",
  system: "border-white/10 bg-white/[0.04] text-foreground",
};

export function ChatPanel({ messages, onSend, isGenerating }: { messages: ChatMessage[]; onSend: (payload: ChatSendPayload) => void; isGenerating: boolean; }) {
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages.length, isGenerating]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    onSend({ prompt: trimmed, attachment });
    setInput("");
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 1_500_000) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setAttachment({ name: file.name, mime_type: file.type, data_url: reader.result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#111118]/90">
      <div className="border-b border-white/8 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">Creative prompt rail</p>
        <h2 className="mt-2 font-display text-[1.9rem] tracking-[-0.04em] text-foreground">게임 제작 채팅</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">왼쪽에서 요청을 정리하고, 중앙 프리뷰와 진단 레일로 즉시 결과를 검수합니다.</p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div ref={scrollViewportRef} className="grid gap-3 px-4 py-4 sm:px-5">
          {messages.length === 0 ? (
            <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-white/[0.03] p-5">
              <h3 className="font-display text-2xl tracking-[-0.04em] text-foreground">무엇을 만들까요?</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">구체적인 장르, 분위기, 조작감, 목표 루프를 적어주면 멀티 에이전트가 초안을 만듭니다.</p>
              <div className="mt-4 grid gap-2">
                {[
                  "신스웨이브 네온 서킷 위를 달리는 3D 오픈휠 레이싱 게임 만들어줘.",
                  "로우폴리 섬과 링을 활용한 3D 비행 게임 만들어줘.",
                  "탑뷰 슈팅에 대시와 웨이브 시스템을 넣은 아레나 게임 만들어줘.",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="cursor-pointer rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-white/16 hover:bg-white/[0.05] hover:text-foreground"
                    onClick={() => onSend({ prompt: suggestion })}
                    disabled={isGenerating}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <article key={message.id} className={cn("rounded-[1.4rem] border px-4 py-3 text-sm leading-6", ROLE_TONE[message.role])}>
                <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <span>{ROLE_LABELS[message.role]}</span>
                  <time className="text-muted-foreground">{new Date(message.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
                <p className="whitespace-pre-wrap text-pretty">{message.content}</p>
                {message.attachment ? (
                  <div className="mt-3">
                    {message.attachment.data_url ? (
                      <Image src={message.attachment.data_url} alt={message.attachment.name} width={128} height={96} unoptimized className="rounded-2xl border border-white/8 object-cover" />
                    ) : (
                      <p className="text-xs text-muted-foreground">첨부: {message.attachment.name}</p>
                    )}
                  </div>
                ) : null}
              </article>
            ))
          )}

          {isGenerating ? (
            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.04] px-4 py-4 text-sm text-muted-foreground">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">멀티 에이전트</div>
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-accent" />
                <span>현재 프롬프트를 해석하고 결과를 준비하는 중입니다…</span>
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-white/8 px-4 py-4 sm:px-5">
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePickImage} />
        <div className="grid gap-3">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (input.trim()) {
                  onSend({ prompt: input.trim(), attachment });
                  setInput("");
                  setAttachment(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }
            }}
            placeholder={isGenerating ? "에이전트 루프 실행 중..." : "원하는 게임을 자세히 적어주세요... (Enter 전송 / Shift+Enter 줄바꿈)"}
            disabled={isGenerating}
            rows={4}
            className="min-h-[7.5rem]"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isGenerating}>
                <ImagePlus className="size-4" />
                이미지
              </Button>
              {attachment ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                  첨부 제거 · {attachment.name}
                </Button>
              ) : null}
            </div>
            <Button type="submit" size="lg" disabled={isGenerating || !input.trim()}>
              <SendHorizontal className="size-4" />
              전송
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export type { ChatAttachment, ChatMessage, ChatSendPayload } from "@/components/editor/types";
