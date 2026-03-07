import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function QueueSummaryPane({ title, count, events, labelForEvent }: { title: string; count: number; events: Array<{ id: string; event_type: string; summary?: string }>; labelForEvent: (eventType: string) => string; }) {
  return (
    <Card data-admin-surface={title} className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="grid gap-3">
        {events.length === 0 ? (
          <p className="rounded-[1rem] border border-dashed border-zinc-200 px-4 py-6 text-sm text-muted-foreground">이벤트가 없습니다.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="rounded-[1rem] border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm leading-6 text-muted-foreground">
              <p className="text-[11px] font-semibold text-primary">{labelForEvent(event.event_type)}</p>
              <p className="mt-2 text-foreground">{event.summary}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
