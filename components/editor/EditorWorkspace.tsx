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
    previewHtml,
    messages,
    isDesktop,
    handleSend,
    handlePublish,
    handleStartFreshSession,
    handleSelectSession,
    handleDeleteSession,
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

      <div className={`grid min-h-[72vh] gap-4 ${isDesktop ? "xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]" : ""}`}>
        <div className="min-h-0">
          <EditorSidebar messages={messages} onSend={handleSend} isGenerating={isGenerating} initialPrompt={initialPrompt} />
        </div>
        <div className="min-h-0">
          <EditorPreviewStage html={previewHtml} />
        </div>
      </div>
    </div>
  );
}
