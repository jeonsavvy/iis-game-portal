"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

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

type SessionEvent = {
  id: string;
  event_type: string;
  agent?: string | null;
  action?: string | null;
  summary?: string;
  score?: number | null;
  decision_reason?: string;
  input_signal?: string;
  change_impact?: string;
  confidence?: number | null;
  error_code?: string | null;
  before_score?: number | null;
  after_score?: number | null;
  created_at?: string;
};

const API_BASE = "/api/sessions";
const CHAT_MIN_WIDTH = 300;
const CHAT_MAX_WIDTH = 520;
const LOG_MIN_WIDTH = 300;
const LOG_MAX_WIDTH = 520;

let msgCounter = 0;
function makeId() {
  return `msg-${Date.now()}-${++msgCounter}`;
}

function activityRole(agent: string): ChatMessage["role"] {
  if (agent === "visual_qa") return "visual_qa";
  if (agent === "playtester") return "playtester";
  return "assistant";
}

function summarizeActivity(activity: AgentActivity): string {
  const score = activity.score > 0 ? ` (${activity.score}점)` : "";
  const delta =
    typeof activity.before_score === "number" && typeof activity.after_score === "number"
      ? ` [${activity.before_score}→${activity.after_score}]`
      : "";
  return `${activity.agent}/${activity.action}${score}${delta} · ${activity.summary || "처리 완료"}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeActivityFromEvent(event: SessionEvent): AgentActivity | null {
  if (!event.agent) return null;
  return {
    agent: event.agent,
    action: event.action || "event",
    summary: event.summary || event.event_type,
    score: typeof event.score === "number" ? event.score : 0,
    decision_reason: event.decision_reason || "",
    input_signal: event.input_signal || "",
    change_impact: event.change_impact || "",
    confidence: typeof event.confidence === "number" ? event.confidence : undefined,
    error_code: event.error_code || null,
    before_score: typeof event.before_score === "number" ? event.before_score : null,
    after_score: typeof event.after_score === "number" ? event.after_score : null,
  };
}

function summarizeFailure(event: SessionEvent | null): string {
  if (!event) {
    return "코어 엔진 요청이 실패했습니다. 잠시 후 다시 시도하거나 QA 재실행을 눌러주세요.";
  }
  const chunks = [
    event.summary?.trim() || "",
    event.error_code?.trim() ? `code=${event.error_code}` : "",
    event.decision_reason?.trim() ? `why=${event.decision_reason}` : "",
  ].filter(Boolean);
  if (chunks.length === 0) {
    return "코어 엔진 요청이 실패했습니다. 이벤트 상세를 확인해주세요.";
  }
  return chunks.join(" · ");
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

  if (typeof row.error === "string" && row.error.trim()) {
    const code = typeof row.code === "string" ? row.code.trim() : "";
    const detail = typeof row.detail === "string" ? row.detail.trim() : "";
    if (code && detail) return `${row.error} (${code}) · ${detail}`;
    if (code) return `${row.error} (${code})`;
    return row.error;
  }
  if (typeof row.detail === "string" && row.detail.trim()) return row.detail;
  return "요청 처리 중 오류가 발생했습니다";
}

export function EditorWorkspace() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);
  const [chatWidth, setChatWidth] = useState(360);
  const [logWidth, setLogWidth] = useState(340);
  const [isDesktop, setIsDesktop] = useState(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    mode: "chat" | "log";
    rectLeft: number;
    rectRight: number;
  } | null>(null);

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

  useEffect(() => {
    const syncViewport = () => {
      setIsDesktop(window.innerWidth >= 1100);
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      if (drag.mode === "chat") {
        const target = event.clientX - drag.rectLeft;
        const maxChat = Math.max(
          CHAT_MIN_WIDTH,
          Math.min(CHAT_MAX_WIDTH, drag.rectRight - drag.rectLeft - LOG_MIN_WIDTH - 460),
        );
        setChatWidth(clamp(target, CHAT_MIN_WIDTH, maxChat));
        return;
      }

      const fromRight = drag.rectRight - event.clientX;
      const maxLog = Math.max(
        LOG_MIN_WIDTH,
        Math.min(LOG_MAX_WIDTH, drag.rectRight - drag.rectLeft - CHAT_MIN_WIDTH - 460),
      );
      setLogWidth(clamp(fromRight, LOG_MIN_WIDTH, maxLog));
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      document.body.classList.remove("editor-resizing");
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startResize = useCallback(
    (mode: "chat" | "log") => (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!isDesktop) return;
      const rect = workspaceRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragStateRef.current = {
        mode,
        rectLeft: rect.left,
        rectRight: rect.right,
      };
      document.body.classList.add("editor-resizing");
      event.preventDefault();
    },
    [isDesktop],
  );

  const loadRecentEvents = useCallback(async (sessionId: string): Promise<SessionEvent[]> => {
    const res = await fetch(`${API_BASE}/${sessionId}/events?limit=12`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const payload = (await res.json().catch(() => ({}))) as { events?: SessionEvent[] };
    if (!Array.isArray(payload.events)) return [];
    return payload.events.slice().reverse();
  }, []);

  const handleSend = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      setError(null);
      setLastPrompt(prompt);
      let activeSessionId: string | null = null;

      try {
        const sessionId = await ensureSession();
        activeSessionId = sessionId;

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
        const activityMessages: ChatMessage[] = nextActivities.map((activity) => ({
          id: makeId(),
          role: activityRole(activity.agent),
          content: summarizeActivity(activity),
          timestamp: Date.now(),
        }));

        const assistantMsg: ChatMessage = {
          id: makeId(),
          role: "assistant",
          content: `✅ 멀티에이전트 루프 완료 (점수: ${nextScore}/100)`,
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
            messages: [...prev.messages, ...activityMessages, assistantMsg],
            activities: nextActivities,
          };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        const diagnostics = activeSessionId ? await loadRecentEvents(activeSessionId) : [];
        const failedEvent =
          diagnostics
            .slice()
            .reverse()
            .find((event) => event.event_type.includes("failed") || Boolean(event.error_code)) || null;
        const failureSummary = summarizeFailure(failedEvent);
        const nextActivities = diagnostics
          .map((event) => normalizeActivityFromEvent(event))
          .filter((row): row is AgentActivity => Boolean(row));

        const normalizedMessage = `${msg} · ${failureSummary}`;
        setError(normalizedMessage);
        setSession((prev) => {
          if (!prev) return prev;
          const diagnosticMessages: ChatMessage[] = diagnostics
            .slice(-4)
            .map((event) => ({
              id: makeId(),
              role: activityRole(event.agent || "codegen"),
              content: `🧾 ${event.event_type}: ${event.summary || event.error_code || "상세 없음"}`,
              timestamp: Date.now(),
            }));
          return {
            ...prev,
            messages: [
              ...prev.messages,
              ...diagnosticMessages,
              {
                id: makeId(),
                role: "system",
                content: `⚠️ ${normalizedMessage}`,
                timestamp: Date.now(),
              },
            ],
            activities: nextActivities.length > 0 ? nextActivities : prev.activities,
          };
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [ensureSession, loadRecentEvents],
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
          <span className="editor-loop-badge">Codegen · Visual QA · Playtester</span>
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

      <div
        className="editor-workspace"
        ref={workspaceRef}
        style={
          isDesktop
            ? { gridTemplateColumns: `${chatWidth}px 8px minmax(0,1fr) 8px ${logWidth}px` }
            : undefined
        }
      >
        <ChatPanel messages={session?.messages ?? []} onSend={handleSend} isGenerating={isGenerating} />
        {isDesktop ? (
          <div
            className="editor-resizer editor-resizer--chat"
            onMouseDown={startResize("chat")}
            role="separator"
            aria-orientation="vertical"
            aria-label="채팅 패널 너비 조절"
          />
        ) : null}
        <GamePreview html={session?.html ?? ""} />
        {isDesktop ? (
          <div
            className="editor-resizer editor-resizer--log"
            onMouseDown={startResize("log")}
            role="separator"
            aria-orientation="vertical"
            aria-label="에이전트 로그 너비 조절"
          />
        ) : null}
        <AgentLogPanel
          activities={session?.activities ?? []}
          isOpen
          lockOpen
          onRetryLast={handleRetryLast}
          onRerunQa={handleRerunQa}
          onRestorePrevious={handleRestorePrevious}
          isBusy={isGenerating}
        />
      </div>
    </div>
  );
}
