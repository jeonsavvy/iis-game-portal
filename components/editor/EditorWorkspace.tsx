"use client";

import { AgentLogPanel } from "@/components/editor/AgentLogPanel";
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
    handleRerunQa,
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

      <div className={`grid min-h-[74vh] gap-4 ${isDesktop ? "xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]" : ""}`}>
        <div className={`min-h-0 ${isDesktop ? "" : "order-2"}`}>
          <div className={`grid min-h-full gap-4 ${isDesktop ? "xl:grid-rows-[minmax(0,1.18fr)_minmax(18rem,0.82fr)]" : ""}`}>
            <div className="min-h-0">
              <EditorSidebar messages={messages} onSend={handleSend} isGenerating={isGenerating} initialPrompt={initialPrompt} />
            </div>
            <div className="min-h-0">
              <AgentLogPanel
                activities={activities}
                runStatus={runStatus}
                runId={runId}
                runError={runError}
                isBusy={isGenerating}
                issueBusy={isIssueBusy}
                onRetryLast={handleRetryLast}
                onRerunQa={handleRerunQa}
                onRestorePrevious={handleRestorePrevious}
                onProposeFix={handleProposeFix}
                onApplyFix={handleApplyFix}
                canProposeFix={actionsState.canProposeFix}
                canApplyFix={actionsState.canApplyFix}
              />
            </div>
          </div>
        </div>
        <div className={`min-h-0 ${isDesktop ? "" : "order-1"}`}>
          <EditorPreviewStage html={previewHtml} />
        </div>
      </div>
    </div>
  );
}
