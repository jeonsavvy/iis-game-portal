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
  canRetryLast,
  canRestorePrevious,
  canProposeFix,
  canApplyFix,
  onRetryLast,
  onRestorePrevious,
  onProposeFix,
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
  canRetryLast: boolean;
  canRestorePrevious: boolean;
  canProposeFix: boolean;
  canApplyFix: boolean;
  onRetryLast: () => void;
  onRestorePrevious: () => void;
  onProposeFix: () => void;
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
        canRetryLast={canRetryLast}
        canRestorePrevious={canRestorePrevious}
        canProposeFix={canProposeFix}
        canApplyFix={canApplyFix}
        onRetryLast={onRetryLast}
        onRestorePrevious={onRestorePrevious}
        onProposeFix={onProposeFix}
        onApplyFix={onApplyFix}
      />
    </div>
  );
}
