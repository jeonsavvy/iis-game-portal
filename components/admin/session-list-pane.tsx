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
    <Card className="rounded-[1.85rem] border-white/8 bg-[#101118]/82 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.7rem] tracking-[-0.04em] text-foreground">세션 목록</h2>
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
                  "cursor-pointer rounded-[1.4rem] border px-4 py-4 text-left transition-all duration-200",
                  active ? "border-accent/45 bg-accent/10 shadow-[0_10px_30px_rgba(180,147,94,0.16)]" : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{session.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{labelForStatus(session.status)}</p>
                  </div>
                  <Badge variant={session.latestError ? "destructive" : "outline"}>{labelForRunStatus(session.runStatus)}</Badge>
                </div>
                {session.latestError ? <p className="mt-3 text-xs leading-5 text-red-200">최근 오류: {session.latestError}</p> : null}
              </button>
            );
          })}
          {items.length === 0 ? <p className="rounded-[1.35rem] border border-dashed border-white/10 px-4 py-6 text-sm text-muted-foreground">세션이 없습니다.</p> : null}
        </div>
      </ScrollArea>
    </Card>
  );
}
