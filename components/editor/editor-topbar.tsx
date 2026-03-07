import { Plus, Rocket, ShieldCheck } from "lucide-react";

import type { RunStatus } from "@/components/editor/types";
import { Button } from "@/components/ui/button";

const RUN_LABELS: Record<RunStatus, string> = {
  idle: "대기",
  queued: "대기열",
  retrying: "재시도 예정",
  running: "실행 중",
  succeeded: "완료",
  failed: "실패",
  cancelled: "취소됨",
};

export function EditorTopbar({ runStatus, canPublish, onFreshSession, onApprovePublish, onPublish, disableActions }: { runStatus: RunStatus; canPublish: boolean; onFreshSession: () => void; onApprovePublish: () => void; onPublish: () => void; disableActions: boolean; }) {
  return (
    <div className="flex flex-col gap-3 rounded-[1rem] border border-zinc-200 bg-white p-4 shadow-[var(--shadow-soft)] lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-[1.8rem] font-semibold tracking-[-0.03em] text-foreground">내 작업공간</h1>
        <span className="text-sm text-muted-foreground">{RUN_LABELS[runStatus]}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onFreshSession} disabled={disableActions}><Plus className="size-4" />새 세션</Button>
        <Button type="button" variant="outline" size="sm" onClick={onApprovePublish} disabled={disableActions}><ShieldCheck className="size-4" />퍼블리시 승인</Button>
        <Button type="button" size="sm" onClick={onPublish} disabled={!canPublish || disableActions}><Rocket className="size-4" />퍼블리시</Button>
      </div>
    </div>
  );
}
