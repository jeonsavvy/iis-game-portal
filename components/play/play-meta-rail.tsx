import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function PlayMetaRail({
  previewMode,
  artifactMessage,
  controls,
  overview,
}: {
  previewMode: boolean;
  artifactMessage?: string | null;
  controls: string[];
  overview: string[];
}) {
  return (
    <div className="grid gap-4">
      <Card className="rounded-[1.8rem] border-white/8 bg-[#111118]/88 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Stage notes</p>
            <h2 className="mt-2 font-display text-[1.8rem] tracking-[-0.04em] text-foreground">플레이 레일</h2>
          </div>
          <Badge variant={previewMode ? "warning" : "outline"}>{previewMode ? "Preview" : "Live"}</Badge>
        </div>
        {artifactMessage ? <p className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-300/8 px-4 py-3 text-sm leading-6 text-amber-100">{artifactMessage}</p> : null}
      </Card>

      <Card className="rounded-[1.8rem] border-white/8 bg-white/[0.03] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Quick controls</p>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
          {controls.slice(0, 3).map((line, index) => (
            <li key={`quick-control-${index}-${line}`} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">{line}</li>
          ))}
        </ul>
      </Card>

      <Card className="rounded-[1.8rem] border-white/8 bg-white/[0.03] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Overview</p>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
          {overview.slice(0, 3).map((line, index) => (
            <li key={`quick-overview-${index}-${line}`}>{line}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
