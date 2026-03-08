"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export type TimelineEvent = {
  id: string;
  event_type: string;
  agent?: string | null;
  action?: string | null;
  summary?: string;
  score?: number | null;
  before_score?: number | null;
  after_score?: number | null;
  decision_reason?: string;
  input_signal?: string;
  change_impact?: string;
  confidence?: number | null;
  error_code?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export function EventTimelinePane({
  events,
  selectedTitle,
  formatDateTime,
  labelForAgent,
  labelForAction,
  labelForEvent,
}: {
  events: TimelineEvent[];
  selectedTitle?: string | null;
  formatDateTime: (value: string) => string;
  labelForAgent: (agent: string | null | undefined, eventType: string) => string;
  labelForAction: (action: string | null | undefined) => string;
  labelForEvent: (eventType: string) => string;
}) {
  return (
    <Card data-admin-surface="event-timeline" className="bg-white/72 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">이벤트 타임라인</h2>
          <p className="text-sm text-muted-foreground">{selectedTitle ? `${selectedTitle} · 최근 이벤트 흐름` : "선택된 세션의 이벤트를 시간 순서대로 확인합니다."}</p>
        </div>
        <Badge variant="secondary">{events.length}</Badge>
      </div>
      <ScrollArea className="h-[28rem] pr-3 xl:h-[40rem]">
        <div className="grid gap-3">
          {events.map((event) => (
            <article key={event.id} className="rounded-[1rem] border border-[#1b1337]/8 bg-white/88 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={event.error_code ? "destructive" : "outline"}>{labelForAgent(event.agent, event.event_type)}</Badge>
                <span className="text-sm font-medium text-foreground">{labelForAction(event.action)}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(event.created_at)}</span>
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <p className="text-foreground">{event.summary || labelForEvent(event.event_type)}</p>
                <p className="text-xs text-primary">{labelForEvent(event.event_type)}</p>
                {event.input_signal ? <p>입력: {event.input_signal}</p> : null}
                {event.decision_reason ? <p>판단 근거: {event.decision_reason}</p> : null}
                {event.change_impact ? <p>영향: {event.change_impact}</p> : null}
                {typeof event.metadata?.scaffold_key === "string" ? <p>기반 scaffold: {event.metadata.scaffold_key as string}</p> : null}
                {typeof event.metadata?.generation_mode === "string" ? <p>생성 모드: {event.metadata.generation_mode as string}</p> : null}
                {typeof event.confidence === "number" ? <p>신뢰도: {event.confidence.toFixed(2)}</p> : null}
                {event.error_code ? <p className="text-red-600">오류 코드: {event.error_code}</p> : null}
              </div>
            </article>
          ))}
          {events.length === 0 ? <p className="rounded-[1rem] border border-dashed border-zinc-200 px-4 py-6 text-sm text-muted-foreground">표시할 이벤트가 없습니다.</p> : null}
        </div>
      </ScrollArea>
    </Card>
  );
}
