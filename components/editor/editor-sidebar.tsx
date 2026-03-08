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
  onRestorePrevious,
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
  onRestorePrevious: () => void;
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
        onRestorePrevious={onRestorePrevious}
        onApplyFix={onApplyFix}
      />
    </div>
  );
}
