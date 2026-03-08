import { ChatPanel } from "@/components/editor/ChatPanel";
import type { AgentActivity, ChatMessage, ChatSendPayload, RunStatus } from "@/components/editor/types";

export function EditorSidebar({
  messages,
  onSend,
  isGenerating,
  initialPrompt = "",
  activities,
  runStatus,
  runId,
  runError,
  canRestorePrevious,
  canApplyFix,
  canKeepCurrentVersion,
  onRestorePrevious,
  onKeepCurrentVersion,
  onApplyFix,
}: {
  messages: ChatMessage[];
  onSend: (payload: ChatSendPayload) => void;
  isGenerating: boolean;
  initialPrompt?: string;
  activities: AgentActivity[];
  runStatus: RunStatus;
  runId?: string | null;
  runError?: string | null;
  canRestorePrevious: boolean;
  canApplyFix: boolean;
  canKeepCurrentVersion: boolean;
  onRestorePrevious: () => void;
  onKeepCurrentVersion: () => void;
  onApplyFix: () => void;
}) {
  return (
    <div className="min-h-0 h-full">
      <ChatPanel
        messages={messages}
        onSend={onSend}
        isGenerating={isGenerating}
        initialPrompt={initialPrompt}
        activities={activities}
        runStatus={runStatus}
        runId={runId}
        runError={runError}
        canRestorePrevious={canRestorePrevious}
        canApplyFix={canApplyFix}
        canKeepCurrentVersion={canKeepCurrentVersion}
        onRestorePrevious={onRestorePrevious}
        onKeepCurrentVersion={onKeepCurrentVersion}
        onApplyFix={onApplyFix}
      />
    </div>
  );
}
