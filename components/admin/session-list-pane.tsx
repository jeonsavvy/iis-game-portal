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
};

export function SessionListPane({ items, selectedSessionId, onSelect, labelForStatus, labelForRunStatus }: { items: SessionListItem[]; selectedSessionId: string; onSelect: (sessionId: string) => void; labelForStatus: (value: string) => string; labelForRunStatus: (value: string) => string; }) {
  return (
    <Card data-admin-surface="session-list" className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">세션 목록</h2>
          <p className="text-sm text-muted-foreground">진행 중인 세션을 선택하면 중앙 타임라인과 큐가 함께 갱신됩니다.</p>
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
                  active ? "border-primary/40 bg-orange-50 shadow-none" : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{session.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{labelForStatus(session.status)}</p>
                  </div>
                  <Badge variant={session.latestError ? "destructive" : "outline"}>{labelForRunStatus(session.runStatus)}</Badge>
                </div>
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
