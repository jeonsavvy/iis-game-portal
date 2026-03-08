"use client";

import Image from "next/image";
import { ImagePlus, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { AgentActivity, ChatAttachment, ChatMessage, ChatSendPayload, RunStatus } from "@/components/editor/types";
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

const RUN_LABELS: Record<RunStatus, string> = {
  idle: "대기",
  queued: "대기열",
  retrying: "재시도 예정",
  running: "실행 중",
  succeeded: "완료",
  failed: "실패",
  cancelled: "취소됨",
};

const AGENT_LABELS: Record<string, string> = {
  codegen: "빌더",
  visual_qa: "시각 점검",
  playtester: "플레이 점검",
};

const ACTION_LABELS: Record<string, string> = {
  generate: "생성",
  modify: "수정",
  evaluate: "평가",
  test: "테스트",
  refine: "개선",
  publish: "퍼블리시",
};

function statusTone(runStatus: RunStatus): "outline" | "success" | "destructive" {
  if (runStatus === "succeeded") return "success";
  if (runStatus === "failed" || runStatus === "cancelled") return "destructive";
  return "outline";
}

function buildUserFacingStatusSummary({
  latestActivity,
  runStatus,
  runError,
  canApplyFix,
  canKeepCurrentVersion,
}: {
  latestActivity: AgentActivity | null;
  runStatus: RunStatus;
  runError?: string | null;
  canApplyFix: boolean;
  canKeepCurrentVersion: boolean;
}): string {
  if (canApplyFix || canKeepCurrentVersion) {
    return "수정안 검토 단계입니다. 1) 현재 버전 유지 2) 수정안 반영 중 하나를 고르세요.";
  }
  if (runStatus === "queued" || runStatus === "retrying" || runStatus === "running") {
    return "지금 요청을 처리 중입니다. 끝나면 오른쪽 게임 화면이 새 결과로 바뀝니다.";
  }
  if (runError) {
    return "이번 실행에서 문제가 생겼습니다. 아래 입력창에 고장 내용을 그대로 적으면 자동으로 수정 요청으로 처리됩니다.";
  }
  const summary = (latestActivity?.summary ?? "").toLowerCase();
  if (summary.includes("proposal applied") || summary.includes("수정안 적용")) {
    return "수정안이 적용됐습니다. 오른쪽 게임 화면이 최신 결과입니다.";
  }
  if (runStatus === "succeeded") {
    return "요청 처리가 끝났습니다. 오른쪽 게임 화면이 최신 결과입니다.";
  }
  return "버그나 수정 요청은 아래 입력창에 그대로 적어 보내면 자동으로 수정 흐름으로 넘어갑니다.";
}

export function ChatPanel({
  messages,
  onSend,
  isGenerating,
  initialPrompt = "",
  activities,
  runStatus,
  runId,
  runError,
  canRestorePrevious,
  canApplyFix,
  canKeepCurrentVersion,
  onRestorePrevious,
  onKeepCurrentVersion,
  onApplyFix,
}: {
  messages: ChatMessage[];
  onSend: (payload: ChatSendPayload) => void;
  isGenerating: boolean;
  initialPrompt?: string;
  activities: AgentActivity[];
  runStatus: RunStatus;
  runId?: string | null;
  runError?: string | null;
  canRestorePrevious: boolean;
  canApplyFix: boolean;
  canKeepCurrentVersion: boolean;
  onRestorePrevious: () => void;
  onKeepCurrentVersion: () => void;
  onApplyFix: () => void;
}) {
  const [input, setInput] = useState(initialPrompt);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const latestActivity = activities.length > 0 ? activities[activities.length - 1] : null;
  const statusSummary = buildUserFacingStatusSummary({
    latestActivity,
    runStatus: isGenerating ? "running" : runStatus,
    runError,
    canApplyFix,
    canKeepCurrentVersion,
  });
  const showStatusPanel = Boolean(runError || canApplyFix || canKeepCurrentVersion || canRestorePrevious);

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
    <div className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-[#1b1337]/10 bg-white/78 shadow-[0_18px_36px_rgba(27,19,55,0.06)] backdrop-blur-sm">
      <div className="border-b border-[#1b1337]/8 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">채팅</h2>
          </div>
          <Badge variant={statusTone(runStatus)}>{RUN_LABELS[runStatus]}</Badge>
        </div>
        {showStatusPanel ? (
          <div className="mt-4 rounded-[1.1rem] border border-[#1b1337]/8 bg-white/88 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm leading-6 text-foreground">{statusSummary}</p>
                {latestActivity ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {AGENT_LABELS[latestActivity.agent] ?? latestActivity.agent} · {ACTION_LABELS[latestActivity.action] ?? latestActivity.action}
                  </p>
                ) : null}
                {runId ? <p className="mt-1 text-xs text-muted-foreground">실행 ID: {runId}</p> : null}
                {runError ? <p className="mt-2 text-sm text-red-700">{runError}</p> : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {canKeepCurrentVersion ? (
                <Button type="button" variant="ghost" size="sm" onClick={onKeepCurrentVersion} disabled={isGenerating}>
                  1. 현재 버전 유지
                </Button>
              ) : null}
              {canApplyFix ? (
                <Button type="button" size="sm" onClick={onApplyFix} disabled={isGenerating}>
                  2. 수정안 반영
                </Button>
              ) : null}
              {canRestorePrevious ? (
                <Button type="button" variant="ghost" size="sm" onClick={onRestorePrevious} disabled={isGenerating}>
                  직전 결과 롤백
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div ref={scrollViewportRef} className="grid gap-3 px-4 py-4 sm:px-5">
          {messages.length === 0 && !input.trim() ? (
            <div className="rounded-[1.2rem] border border-dashed border-[#1b1337]/10 bg-white/70 p-5">
              <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">무엇을 만들까요?</h3>
              <div className="mt-4 grid gap-2">
                {[
                  "로우폴리 섬과 링을 활용한 3D 비행 게임 만들어줘.",
                  "탑뷰 슈팅에 대시와 웨이브 시스템을 넣은 아레나 게임 만들어줘.",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="cursor-pointer rounded-2xl border border-[#1b1337]/10 bg-[#f8f4eb] px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-[#1b1337]/16 hover:bg-white hover:text-foreground"
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
              <article key={message.id} className={cn("rounded-[1rem] border px-4 py-3 text-sm leading-6 shadow-none", ROLE_TONE[message.role])}>
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
            <div className="rounded-[1rem] border border-[#1b1337]/10 bg-[#f8f4eb] px-4 py-4 text-sm text-muted-foreground">
              <div className="mb-2 text-[11px] font-semibold text-accent">생성 중</div>
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-accent" />
                <span>현재 프롬프트를 해석하고 결과를 준비하는 중입니다…</span>
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-[#1b1337]/8 px-4 py-4 sm:px-5">
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
