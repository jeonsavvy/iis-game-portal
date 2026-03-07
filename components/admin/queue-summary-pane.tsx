import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function QueueSummaryPane({ title, count, events, labelForEvent }: { title: string; count: number; events: Array<{ id: string; event_type: string; summary?: string }>; labelForEvent: (eventType: string) => string; }) {
  return (
    <Card className="rounded-[1.85rem] border-white/8 bg-[#101118]/82 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-[1.6rem] tracking-[-0.04em] text-foreground">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="grid gap-3">
        {events.length === 0 ? (
          <p className="rounded-[1.35rem] border border-dashed border-white/10 px-4 py-6 text-sm text-muted-foreground">이벤트가 없습니다.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-muted-foreground">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">{labelForEvent(event.event_type)}</p>
              <p className="mt-2 text-foreground">{event.summary}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
