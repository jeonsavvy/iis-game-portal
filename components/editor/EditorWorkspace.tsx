"use client";

import { useState } from "react";

import { AgentLogPanel } from "@/components/editor/AgentLogPanel";
import { EditorPreviewStage } from "@/components/editor/editor-preview-stage";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { EditorStatusBanners } from "@/components/editor/editor-status-banners";
import { EditorTopbar } from "@/components/editor/editor-topbar";
import { useEditorSession } from "@/components/editor/use-editor-session";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function EditorWorkspace() {
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const {
    session,
    isGenerating,
    isIssueBusy,
    error,
    restoreWarning,
    isRestoring,
    runStatus,
    runId,
    runError,
    previewHtml,
    messages,
    activities,
    isDesktop,
    chatWidth,
    workspaceRef,
    startResize,
    handleSend,
    handleRetryLast,
    handleRerunQa,
    handleRestorePrevious,
    handleProposeFix,
    handleApplyFix,
    handleApprovePublish,
    handlePublish,
    handleStartFreshSession,
    dismissError,
    dismissRestoreWarning,
    actionsState,
  } = useEditorSession();

  const quickActions = [
    { id: "retry-last", label: "마지막 요청 재실행", onClick: handleRetryLast, disabled: isGenerating },
    { id: "rerun-qa", label: "QA 다시 실행", onClick: handleRerunQa, disabled: !session?.id || isGenerating },
    { id: "restore-previous", label: "직전 결과 복원", onClick: handleRestorePrevious, disabled: isGenerating },
    { id: "propose-fix", label: "수정안 다시 생성", onClick: handleProposeFix, disabled: !actionsState.canProposeFix || isIssueBusy },
    { id: "apply-fix", label: "수정안 적용", onClick: handleApplyFix, disabled: !actionsState.canApplyFix || isIssueBusy, tone: "primary" as const },
  ];

  const diagnostics = (
    <AgentLogPanel
      activities={activities}
      runStatus={runStatus}
      runId={runId}
      runError={runError}
      isBusy={isGenerating}
      onCancelRun={undefined}
      onRetryLast={handleRetryLast}
      onRerunQa={handleRerunQa}
      onRestorePrevious={handleRestorePrevious}
      onProposeFix={handleProposeFix}
      onApplyFix={handleApplyFix}
      issueBusy={isIssueBusy}
      canProposeFix={actionsState.canProposeFix}
      canApplyFix={actionsState.canApplyFix}
    />
  );

  return (
    <div className="grid gap-4">
      <EditorTopbar
        runStatus={runStatus}
        runError={runError}
        canPublish={actionsState.canPublish}
        onFreshSession={handleStartFreshSession}
        onApprovePublish={handleApprovePublish}
        onPublish={handlePublish}
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        disableActions={isGenerating || isIssueBusy}
      />

      <EditorStatusBanners
        error={error}
        isRestoring={isRestoring}
        restoreWarning={restoreWarning}
        onDismissError={dismissError}
        onDismissRestoreWarning={dismissRestoreWarning}
      />

      <div
        ref={workspaceRef}
        className="grid min-h-[72vh] gap-4 xl:grid-cols-[var(--editor-chat-width,360px)_10px_minmax(0,1fr)_minmax(18rem,22rem)]"
        style={isDesktop ? ({ ["--editor-chat-width" as string]: `${chatWidth}px` } as React.CSSProperties) : undefined}
      >
        <div className="min-h-0 xl:col-start-1">
          <EditorSidebar messages={messages} onSend={handleSend} isGenerating={isGenerating} actions={quickActions} />
        </div>

        {isDesktop ? (
          <div
            className="hidden cursor-col-resize rounded-full border border-white/8 bg-white/[0.04] xl:block"
            onMouseDown={startResize()}
            role="separator"
            aria-orientation="vertical"
            aria-label="채팅 패널 너비 조절"
          />
        ) : null}

        <div className="min-h-0 xl:col-start-3">
          <EditorPreviewStage html={previewHtml} />
        </div>

        <div className="hidden min-h-0 xl:block xl:col-start-4">{diagnostics}</div>
      </div>

      {!isDesktop ? (
        <Sheet open={diagnosticsOpen} onOpenChange={setDiagnosticsOpen}>
          <SheetContent side="right" className="w-[min(92vw,26rem)] p-0">
            <SheetHeader className="border-b border-white/8 px-5 py-4">
              <SheetTitle>진단 레일</SheetTitle>
              <SheetDescription>현재 세션의 실행 상태, 최근 활동, 수정 흐름을 모바일에서도 바로 확인합니다.</SheetDescription>
            </SheetHeader>
            <div className="h-full min-h-0 p-4">{diagnostics}</div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
