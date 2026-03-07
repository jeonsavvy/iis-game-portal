import { ChatPanel } from "@/components/editor/ChatPanel";
import { EditorActions } from "@/components/editor/editor-actions";
import type { ChatAction, ChatMessage, ChatSendPayload } from "@/components/editor/types";

export function EditorSidebar({ messages, onSend, isGenerating, actions }: { messages: ChatMessage[]; onSend: (payload: ChatSendPayload) => void; isGenerating: boolean; actions: ChatAction[]; }) {
  return (
    <div className="grid min-h-0 gap-4">
      <EditorActions actions={actions} />
      <div className="min-h-0 flex-1">
        <ChatPanel messages={messages} onSend={onSend} isGenerating={isGenerating} />
      </div>
    </div>
  );
}
