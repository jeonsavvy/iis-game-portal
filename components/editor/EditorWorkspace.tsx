"use client";

import { EditorPreviewStage } from "@/components/editor/editor-preview-stage";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { EditorStatusBanners } from "@/components/editor/editor-status-banners";
import { EditorTopbar } from "@/components/editor/editor-topbar";
import { PublishThumbnailDialog } from "@/components/editor/PublishThumbnailDialog";
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
    handleRestorePrevious,
    handleKeepCurrentVersion,
    handleApplyFix,
    dismissError,
    dismissRestoreWarning,
    actionsState,
    sessionOptions,
    selectedSessionId,
    publishDialogOpen,
    publishThumbnailCandidates,
    publishThumbnailLoading,
    publishThumbnailError,
    selectedPublishThumbnailId,
    manualPublishThumbnail,
    handleConfirmPublish,
    closePublishDialog,
    handleSelectPublishThumbnail,
    handleManualPublishThumbnailChange,
    refreshPublishThumbnailCandidates,
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

      <PublishThumbnailDialog
        open={publishDialogOpen}
        isLoading={publishThumbnailLoading}
        isPublishing={isGenerating}
        candidates={publishThumbnailCandidates}
        selectedCandidateId={selectedPublishThumbnailId}
        manualAttachment={manualPublishThumbnail}
        error={publishThumbnailError}
        onClose={closePublishDialog}
        onRefresh={refreshPublishThumbnailCandidates}
        onSelectCandidate={handleSelectPublishThumbnail}
        onManualAttachmentChange={handleManualPublishThumbnailChange}
        onPublish={handleConfirmPublish}
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
            canRestorePrevious={actionsState.canRestorePrevious}
            canApplyFix={actionsState.canApplyFix}
            canKeepCurrentVersion={actionsState.canKeepCurrentVersion}
            onRestorePrevious={handleRestorePrevious}
            onKeepCurrentVersion={handleKeepCurrentVersion}
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
