"use client";

import { AlertTriangle, Bot, CheckCircle2, RotateCcw, Shield, Sparkles } from "lucide-react";

import type { AgentActivity, RunStatus } from "@/components/editor/types";
import { normalizeWorkspaceStatusMessage } from "@/lib/editor/workspace-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const RUN_LABELS: Record<RunStatus, string> = {
  idle: "대기",
  queued: "대기열",
  retrying: "재시도 예정",
  running: "실행 중",
  succeeded: "완료",
  failed: "실패",
  cancelled: "취소됨",
};

const AGENT_LABELS: Record<string, string> = {
  codegen: "코드젠",
  visual_qa: "비주얼 QA",
  playtester: "플레이테스터",
};

const ACTION_LABELS: Record<string, string> = {
  generate: "생성",
  modify: "수정",
  evaluate: "평가",
  test: "테스트",
  refine: "개선",
  run: "실행",
  audit: "감사",
};

export function AgentLogPanel({
  activities,
  runStatus,
  runId,
  runError,
  isBusy,
  onCancelRun,
  onRetryLast,
  onRerunQa,
  onRestorePrevious,
  onProposeFix,
  onApplyFix,
  issueBusy,
  canProposeFix,
  canApplyFix,
}: {
  activities: AgentActivity[];
  runStatus: RunStatus;
  runId?: string | null;
  runError?: string | null;
  isBusy?: boolean;
  onCancelRun?: () => void;
  onRetryLast?: () => void;
  onRerunQa?: () => void;
  onRestorePrevious?: () => void;
  onProposeFix?: () => void;
  onApplyFix?: () => void;
  issueBusy?: boolean;
  canProposeFix?: boolean;
  canApplyFix?: boolean;
}) {
  const latest = activities.length > 0 ? activities[activities.length - 1] : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-[#1b1337]/10 bg-white/78 shadow-[0_18px_36px_rgba(27,19,55,0.06)] backdrop-blur-sm">
      <div className="border-b border-[#1b1337]/8 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">run support</p>
            <h2 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] text-foreground">실행 상태</h2>
          </div>
          <Badge variant={runStatus === "failed" ? "destructive" : runStatus === "succeeded" ? "success" : "outline"}>{RUN_LABELS[runStatus]}</Badge>
        </div>
        {runId ? <p className="mt-2 text-xs text-muted-foreground">실행 ID: {runId}</p> : null}
        {runError ? <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">{runError}</p> : null}
      </div>

      <div className="grid gap-3 border-b border-[#1b1337]/8 px-5 py-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" size="sm" onClick={onRetryLast} disabled={isBusy || !onRetryLast}><RotateCcw className="size-4" />마지막 요청 재실행</Button>
          <Button type="button" variant="outline" size="sm" onClick={onRerunQa} disabled={isBusy || !onRerunQa}><Shield className="size-4" />QA 다시 실행</Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRestorePrevious} disabled={isBusy || !onRestorePrevious}><CheckCircle2 className="size-4" />직전 결과 복원</Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancelRun} disabled={!onCancelRun || runStatus !== "running"}><AlertTriangle className="size-4" />실행 취소</Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" size="sm" onClick={onProposeFix} disabled={Boolean(issueBusy) || !canProposeFix || !onProposeFix}><Sparkles className="size-4" />수정안 다시 생성</Button>
          <Button type="button" size="sm" onClick={onApplyFix} disabled={Boolean(issueBusy) || !canApplyFix || !onApplyFix}><Bot className="size-4" />수정안 적용</Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-3 px-4 py-4 sm:px-5">
          {latest ? (
            <div className="rounded-[1.3rem] border border-[#1b1337]/8 bg-white/88 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{AGENT_LABELS[latest.agent] ?? latest.agent}</Badge>
                <span className="text-sm font-medium text-foreground">{ACTION_LABELS[latest.action] ?? latest.action}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                <p className="text-foreground">{normalizeWorkspaceStatusMessage(latest.summary)}</p>
                {latest.input_signal ? <p>입력 신호: {latest.input_signal}</p> : null}
                {latest.decision_reason ? <p>판단 근거: {latest.decision_reason}</p> : null}
                {latest.change_impact ? <p>변경 영향: {latest.change_impact}</p> : null}
                {typeof latest.confidence === "number" ? <p>신뢰도: {latest.confidence.toFixed(2)}</p> : null}
              </div>
            </div>
          ) : (
            <p className="rounded-[1.3rem] border border-dashed border-[#1b1337]/10 px-4 py-6 text-sm text-muted-foreground">프롬프트를 보내면 실행 상태와 최근 변경 내역이 여기에 표시됩니다.</p>
          )}

          {activities.map((activity, index) => (
            <article key={`${activity.agent}-${activity.action}-${index}`} className="rounded-[1.25rem] border border-[#1b1337]/8 bg-[rgba(255,255,255,0.7)] px-4 py-4 text-sm leading-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{AGENT_LABELS[activity.agent] ?? activity.agent}</Badge>
                <span className="text-foreground">{ACTION_LABELS[activity.action] ?? activity.action}</span>
              </div>
              <p className="mt-2 text-foreground">{normalizeWorkspaceStatusMessage(activity.summary)}</p>
              {activity.change_impact ? <p className="mt-1">{activity.change_impact}</p> : null}
            </article>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export type { AgentActivity, RunStatus } from "@/components/editor/types";
