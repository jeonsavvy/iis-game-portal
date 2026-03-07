import { ChatPanel } from "@/components/editor/ChatPanel";
import type { ChatMessage, ChatSendPayload } from "@/components/editor/types";

export function EditorSidebar({ messages, onSend, isGenerating, initialPrompt = "" }: { messages: ChatMessage[]; onSend: (payload: ChatSendPayload) => void; isGenerating: boolean; initialPrompt?: string; }) {
  return (
    <div className="min-h-0">
      <ChatPanel messages={messages} onSend={onSend} isGenerating={isGenerating} initialPrompt={initialPrompt} />
    </div>
  );
}
