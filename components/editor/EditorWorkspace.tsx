"use client";

import { useCallback, useState } from "react";

import { AgentLogPanel, type AgentActivity } from "@/components/editor/AgentLogPanel";
import { ChatPanel, type ChatMessage } from "@/components/editor/ChatPanel";
import { GamePreview } from "@/components/editor/GamePreview";

type SessionState = {
  id: string;
  html: string;
  score: number;
  status: string;
  messages: ChatMessage[];
  activities: AgentActivity[];
};

const API_BASE = "/api/sessions";

let msgCounter = 0;
function makeId() {
  return `msg-${Date.now()}-${++msgCounter}`;
}

function normalizeError(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "요청 처리 중 오류가 발생했습니다";
  }
  const row = payload as Record<string, unknown>;
  const detail = row.detail;

  if (detail && typeof detail === "object") {
    const detailRow = detail as Record<string, unknown>;
    const nestedError = detailRow.error;
    const nestedCode = detailRow.code;
    if (typeof nestedError === "string" && nestedError.trim()) {
      if (typeof nestedCode === "string" && nestedCode.trim()) {
        return `${nestedError} (${nestedCode})`;
      }
      return nestedError;
    }
  }

  if (typeof row.error === "string" && row.error.trim()) return row.error;
  if (typeof row.detail === "string" && row.detail.trim()) return row.detail;
  return "요청 처리 중 오류가 발생했습니다";
}

export function EditorWorkspace() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (session?.id) return session.id;

    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Session" }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(normalizeError(payload));
    }

    const newId = String(payload.session_id || "");
    setSession({
      id: newId,
      html: "",
      score: 0,
      status: "active",
      messages: [],
      activities: [],
    });
    return newId;
  }, [session]);

  const handleSend = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      setError(null);
      setLastPrompt(prompt);

      try {
        const sessionId = await ensureSession();

        const userMsg: ChatMessage = {
          id: makeId(),
          role: "user",
          content: prompt,
          timestamp: Date.now(),
        };

        setSession((prev) => {
          if (!prev) return prev;
          return { ...prev, messages: [...prev.messages, userMsg] };
        });

        const res = await fetch(`${API_BASE}/${sessionId}/prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, auto_qa: true, stream: false }),
        });

        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(normalizeError(result));
        }

        const nextHtml = typeof result.html === "string" ? result.html : "";
        const nextScore = typeof result.score === "number" ? result.score : 0;
        const nextActivities = Array.isArray(result.activities)
          ? (result.activities as AgentActivity[])
          : [];

        const assistantMsg: ChatMessage = {
          id: makeId(),
          role: "assistant",
          content: `✅ 생성 완료 (점수: ${nextScore}/100)`,
          timestamp: Date.now(),
        };

        setSession((prev) => {
          if (!prev) return prev;
          if (prev.html.trim() && prev.html !== nextHtml) {
            setHtmlHistory((history) => [...history.slice(-9), prev.html]);
          }
          return {
            ...prev,
            html: nextHtml || prev.html,
            score: nextScore,
            status: "active",
            messages: [...prev.messages, assistantMsg],
            activities: nextActivities,
          };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        setError(msg);
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: makeId(),
                role: "system",
                content: `⚠️ ${msg}`,
                timestamp: Date.now(),
              },
            ],
          };
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [ensureSession],
  );

  const handlePublish = useCallback(async () => {
    if (!session?.id || !session.html.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/${session.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "" }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(normalizeError(result));
      }

      const gameUrl = typeof result.game_url === "string" ? result.game_url : "";
      const msg: ChatMessage = {
        id: makeId(),
        role: "system",
        content: `🎉 퍼블리시 성공 → ${gameUrl}`,
        timestamp: Date.now(),
      };
      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: "published",
              messages: [...prev.messages, msg],
            }
          : prev,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "퍼블리시 실패";
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [session]);

  const handleRetryLast = useCallback(() => {
    if (!lastPrompt.trim() || isGenerating) return;
    void handleSend(lastPrompt);
  }, [handleSend, isGenerating, lastPrompt]);

  const handleRerunQa = useCallback(() => {
    if (!session?.id || isGenerating) return;
    void handleSend("현재 게임 플레이는 유지하고 품질 이슈만 재검토해서 개선해줘.");
  }, [handleSend, isGenerating, session?.id]);

  const handleRestorePrevious = useCallback(() => {
    setHtmlHistory((history) => {
      if (history.length === 0) return history;
      const restored = history[history.length - 1];
      setSession((prev) => {
        if (!prev) return prev;
        const msg: ChatMessage = {
          id: makeId(),
          role: "system",
          content: "↩ 직전 결과를 로컬 프리뷰에 복원했습니다.",
          timestamp: Date.now(),
        };
        return { ...prev, html: restored, messages: [...prev.messages, msg] };
      });
      return history.slice(0, -1);
    });
  }, []);

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <h2>🛠️ Session Editor</h2>
        <div className="editor-header-actions">
          {session?.score ? <span className="editor-score">점수: {session.score}/100</span> : null}
          <button
            type="button"
            className="button button-primary"
            disabled={!session?.html.trim() || isGenerating}
            onClick={handlePublish}
          >
            🚀 퍼블리시
          </button>
        </div>
      </header>

      {error && (
        <div className="editor-error">
          <p>{error}</p>
          <button type="button" onClick={() => setError(null)}>
            닫기
          </button>
        </div>
      )}

      <div className="editor-workspace">
        <ChatPanel messages={session?.messages ?? []} onSend={handleSend} isGenerating={isGenerating} />
        <GamePreview html={session?.html ?? ""} />
        <AgentLogPanel
          activities={session?.activities ?? []}
          isOpen={agentPanelOpen}
          onToggle={() => setAgentPanelOpen(!agentPanelOpen)}
          onRetryLast={handleRetryLast}
          onRerunQa={handleRerunQa}
          onRestorePrevious={handleRestorePrevious}
          isBusy={isGenerating}
        />
      </div>
    </div>
  );
}
