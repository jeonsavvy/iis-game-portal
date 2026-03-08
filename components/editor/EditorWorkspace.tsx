"use client";

import { EditorPreviewStage } from "@/components/editor/editor-preview-stage";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { EditorStatusBanners } from "@/components/editor/editor-status-banners";
import { EditorTopbar } from "@/components/editor/editor-topbar";
import { useEditorSession } from "@/components/editor/use-editor-session";

export function EditorWorkspace({ initialPrompt = "" }: { initialPrompt?: string }) {
  const {
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
    handleSend,
    handlePublish,
    handleStartFreshSession,
    handleSelectSession,
    handleDeleteSession,
    handleRetryLast,
    handleRestorePrevious,
    handleProposeFix,
    handleApplyFix,
    dismissError,
    dismissRestoreWarning,
    actionsState,
    sessionOptions,
    selectedSessionId,
  } = useEditorSession();

  return (
    <div className="grid gap-4">
      <EditorTopbar
        runStatus={runStatus}
        canPublish={actionsState.canPublish}
        onFreshSession={handleStartFreshSession}
        onPublish={handlePublish}
        onDeleteSession={handleDeleteSession}
        disableActions={isGenerating || isIssueBusy}
        sessionOptions={sessionOptions}
        selectedSessionId={selectedSessionId}
        onSelectSession={handleSelectSession}
      />

      <EditorStatusBanners
        error={error}
        isRestoring={isRestoring}
        restoreWarning={restoreWarning}
        onDismissError={dismissError}
        onDismissRestoreWarning={dismissRestoreWarning}
      />

      <div className={`grid min-h-[74vh] items-stretch gap-4 ${isDesktop ? "xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)]" : ""}`}>
        <div className={`min-h-0 ${isDesktop ? "" : "order-2"}`}>
          <EditorSidebar
            messages={messages}
            onSend={handleSend}
            isGenerating={isGenerating}
            initialPrompt={initialPrompt}
            activities={activities}
            runStatus={runStatus}
            runId={runId}
            runError={runError}
            canRetryLast={actionsState.canRetryLast}
            canRestorePrevious={actionsState.canRestorePrevious}
            canProposeFix={actionsState.canProposeFix}
            canApplyFix={actionsState.canApplyFix}
            onRetryLast={handleRetryLast}
            onRestorePrevious={handleRestorePrevious}
            onProposeFix={handleProposeFix}
            onApplyFix={handleApplyFix}
          />
        </div>
        <div className={`min-h-0 ${isDesktop ? "" : "order-1"}`}>
          <EditorPreviewStage html={previewHtml} />
        </div>
      </div>
    </div>
  );
}
