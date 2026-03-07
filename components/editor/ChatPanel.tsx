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
  user: "border-zinc-200 bg-zinc-50 text-foreground",
  assistant: "border-orange-100 bg-orange-50 text-foreground",
  visual_qa: "border-emerald-100 bg-emerald-50 text-foreground",
  playtester: "border-amber-100 bg-amber-50 text-foreground",
  system: "border-zinc-200 bg-white text-foreground",
};

export function ChatPanel({ messages, onSend, isGenerating, initialPrompt = "" }: { messages: ChatMessage[]; onSend: (payload: ChatSendPayload) => void; isGenerating: boolean; initialPrompt?: string; }) {
  const [input, setInput] = useState(initialPrompt);
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
    <div className="flex h-full flex-col overflow-hidden rounded-[1rem] border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-5 py-4">
        <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">채팅</h2>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div ref={scrollViewportRef} className="grid gap-3 px-4 py-4 sm:px-5">
          {messages.length === 0 && !input.trim() ? (
            <div className="rounded-[1rem] border border-dashed border-zinc-200 bg-zinc-50 p-5">
              <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">무엇을 만들까요?</h3>
              <div className="mt-4 grid gap-2">
                {[
                  "신스웨이브 네온 서킷 위를 달리는 3D 오픈휠 레이싱 게임 만들어줘.",
                  "로우폴리 섬과 링을 활용한 3D 비행 게임 만들어줘.",
                  "탑뷰 슈팅에 대시와 웨이브 시스템을 넣은 아레나 게임 만들어줘.",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-foreground"
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
              <article key={message.id} className={cn("rounded-[1rem] border px-4 py-3 text-sm leading-6", ROLE_TONE[message.role])}>
                <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold">
                  <span>{ROLE_LABELS[message.role]}</span>
                  <time className="text-muted-foreground">{new Date(message.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
                <p className="whitespace-pre-wrap text-pretty">{message.content}</p>
                {message.attachment ? (
                  <div className="mt-3">
                    {message.attachment.data_url ? (
                      <Image src={message.attachment.data_url} alt={message.attachment.name} width={128} height={96} unoptimized className="rounded-2xl border border-zinc-200 object-cover" />
                    ) : (
                      <p className="text-xs text-muted-foreground">첨부: {message.attachment.name}</p>
                    )}
                  </div>
                ) : null}
              </article>
            ))
          )}

          {isGenerating ? (
            <div className="rounded-[1rem] border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-muted-foreground">
              <div className="mb-2 text-[11px] font-semibold text-accent">생성 중</div>
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-accent" />
                <span>현재 프롬프트를 해석하고 결과를 준비하는 중입니다…</span>
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-zinc-200 px-4 py-4 sm:px-5">
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
            placeholder={isGenerating ? "생성 중..." : "원하는 게임을 적어주세요"}
            disabled={isGenerating}
            rows={4}
            className="min-h-[8rem]"
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
