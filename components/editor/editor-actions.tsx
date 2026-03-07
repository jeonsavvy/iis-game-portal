import type { ChatAction } from "@/components/editor/types";
import { Button } from "@/components/ui/button";

export function EditorActions({ actions }: { actions: ChatAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="grid gap-2 rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">빠른 작업</p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map((action) => (
          <Button key={action.id} type="button" variant={action.tone === "primary" ? "default" : "outline"} size="sm" onClick={action.onClick} disabled={action.disabled} className="justify-start rounded-2xl">
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
