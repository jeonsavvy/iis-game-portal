import { PanelRightOpen, Plus, Rocket, ShieldCheck } from "lucide-react";

import type { RunStatus } from "@/components/editor/types";
import { Badge } from "@/components/ui/badge";
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

export function EditorTopbar({ runStatus, runError, canPublish, onFreshSession, onApprovePublish, onPublish, onOpenDiagnostics, disableActions }: { runStatus: RunStatus; runError?: string | null; canPublish: boolean; onFreshSession: () => void; onApprovePublish: () => void; onPublish: () => void; onOpenDiagnostics: () => void; disableActions: boolean; }) {
  return (
    <div className="rounded-[1.85rem] border border-white/10 bg-[#111118]/88 p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-accent">Session editor</Badge>
            <Badge variant={runStatus === "failed" ? "destructive" : runStatus === "succeeded" ? "success" : "secondary"}>{RUN_LABELS[runStatus]}</Badge>
            {runError ? <Badge variant="warning">진단 있음</Badge> : null}
          </div>
          <div>
            <h1 className="font-display text-[2rem] tracking-[-0.04em] text-foreground">세션 에디터</h1>
            <p className="text-sm leading-6 text-muted-foreground">실시간 프리뷰 스테이지와 진단 레일을 통해 생성 결과를 즉시 조정합니다.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onOpenDiagnostics}><PanelRightOpen className="size-4" />진단 레일</Button>
          <Button type="button" variant="ghost" size="sm" onClick={onFreshSession} disabled={disableActions}><Plus className="size-4" />새 세션</Button>
          <Button type="button" variant="outline" size="sm" onClick={onApprovePublish} disabled={disableActions}><ShieldCheck className="size-4" />퍼블리시 승인</Button>
          <Button type="button" size="sm" onClick={onPublish} disabled={!canPublish || disableActions}><Rocket className="size-4" />퍼블리시</Button>
        </div>
      </div>
    </div>
  );
}
