"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type SessionListItem = {
  session_id: string;
  title: string;
  status: string;
  runStatus: string;
  latestError: string | null;
  generationSummary?: string | null;
  fallbackUsed?: boolean;
};

export function SessionListPane({ items, selectedSessionId, onSelect, labelForStatus, labelForRunStatus }: { items: SessionListItem[]; selectedSessionId: string; onSelect: (sessionId: string) => void; labelForStatus: (value: string) => string; labelForRunStatus: (value: string) => string; }) {
  return (
    <Card data-admin-surface="session-list" className="bg-white/72 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">세션 목록</h2>
          <p className="text-sm text-muted-foreground">세션을 고르면 중앙 타임라인과 큐가 함께 갱신됩니다.</p>
        </div>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <ScrollArea className="h-[28rem] pr-3 xl:h-[40rem]">
        <div className="grid gap-3">
          {items.map((session) => {
            const active = selectedSessionId === session.session_id;
            return (
              <button
                key={session.session_id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(session.session_id)}
                className={cn(
                  "cursor-pointer rounded-[1rem] border px-4 py-4 text-left transition-all duration-200",
                  active ? "border-primary/30 bg-[#fff8ef] shadow-none" : "border-[#1b1337]/8 bg-white/88 hover:border-[#1b1337]/14 hover:bg-white",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{session.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{labelForStatus(session.status)}</p>
                    {session.generationSummary ? <p className="mt-2 text-xs leading-5 text-[#5d5476]">{session.generationSummary}</p> : null}
                  </div>
                  <Badge variant={session.latestError ? "destructive" : "outline"}>{labelForRunStatus(session.runStatus)}</Badge>
                </div>
                {session.fallbackUsed ? <p className="mt-2 text-xs leading-5 text-primary">모델 혼잡으로 대체 경로 사용</p> : null}
                {session.latestError ? <p className="mt-3 text-xs leading-5 text-red-600">최근 오류: {session.latestError}</p> : null}
              </button>
            );
          })}
          {items.length === 0 ? <p className="rounded-[1rem] border border-dashed border-zinc-200 px-4 py-6 text-sm text-muted-foreground">세션이 없습니다.</p> : null}
        </div>
      </ScrollArea>
    </Card>
  );
}
