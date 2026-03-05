"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import {
  AgentLogPanel,
  type AgentActivity,
  type IssueCategory,
  type RunStatus,
} from "@/components/editor/AgentLogPanel";
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

type RunResponse = {
  run_id: string;
  status: RunStatus;
  error_code?: string | null;
  error_detail?: string;
  final_score?: number;
  current_html?: string;
  activities?: AgentActivity[];
};

type SessionFetchResponse = {
  session_id: string;
  status: string;
  current_html: string;
  score?: number;
};

type IssueCreateResponse = {
  issue_id: string;
};

type ProposalResponse = {
  issue_id: string;
  proposal_id: string;
  preview_html: string;
};

type ApplyFixResponse = {
  html: string;
  status: string;
};

const API_BASE = "/api/sessions";
const CHAT_MIN_WIDTH = 320;
const CHAT_MAX_WIDTH = 560;
const LOG_MIN_WIDTH = 360;
const LOG_MAX_WIDTH = 560;
const LAYOUT_STORAGE_KEY = "iis-editor-layout-v3";
const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  gameplay: "게임플레이",
  visual: "비주얼",
  runtime: "런타임",
};

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
    const nested = typeof row.detail === "string" ? row.detail.trim() : "";
    if (code && nested) return `${row.error} (${code}) · ${nested}`;
    if (code) return `${row.error} (${code})`;
    return row.error;
  }
  if (typeof row.detail === "string" && row.detail.trim()) return row.detail;
  return "요청 처리 중 오류가 발생했습니다";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function EditorWorkspace() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isIssueBusy, setIsIssueBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);
  const [chatWidth, setChatWidth] = useState(360);
  const [logWidth, setLogWidth] = useState(390);
  const [isDesktop, setIsDesktop] = useState(false);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [issueDraft, setIssueDraft] = useState("");
  const [issueCategory, setIssueCategory] = useState<IssueCategory>("gameplay");
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [previewHtmlOverride, setPreviewHtmlOverride] = useState<string | null>(null);

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

  const loadRecentEvents = useCallback(async (sessionId: string): Promise<SessionEvent[]> => {
    const res = await fetch(`${API_BASE}/${sessionId}/events?limit=40`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const payload = (await res.json().catch(() => ({}))) as { events?: SessionEvent[] };
    if (!Array.isArray(payload.events)) return [];
    return payload.events.slice().reverse();
  }, []);

  const refreshActivitiesFromEvents = useCallback(
    async (sessionId: string) => {
      const events = await loadRecentEvents(sessionId);
      const nextActivities = events
        .map((event) => normalizeActivityFromEvent(event))
        .filter((row): row is AgentActivity => Boolean(row));
      setSession((prev) => (prev ? { ...prev, activities: nextActivities } : prev));
    },
    [loadRecentEvents],
  );

  const fetchSessionSnapshot = useCallback(async (sessionId: string): Promise<SessionFetchResponse | null> => {
    const res = await fetch(`${API_BASE}/${sessionId}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as SessionFetchResponse | null;
  }, []);

  const pollRun = useCallback(
    async (sessionId: string, queuedRunId: string): Promise<RunResponse> => {
      let attempt = 0;
      while (attempt < 180) {
        attempt += 1;
        const response = await fetch(`${API_BASE}/${sessionId}/runs/${queuedRunId}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as RunResponse;
        if (!response.ok) {
          throw new Error(normalizeError(payload));
        }

        const nextStatus = (payload.status || "queued") as RunStatus;
        setRunStatus(nextStatus);
        setRunError(
          payload.error_code
            ? `${payload.error_code}${payload.error_detail ? ` · ${payload.error_detail}` : ""}`
            : payload.error_detail || null,
        );

        if (Array.isArray(payload.activities)) {
          setSession((prev) => (prev ? { ...prev, activities: payload.activities ?? prev.activities } : prev));
        }

        if (nextStatus === "succeeded" || nextStatus === "failed" || nextStatus === "cancelled") {
          return payload;
        }

        await wait(1200);
      }

      throw new Error("run_poll_timeout");
    },
    [],
  );

  useEffect(() => {
    const syncViewport = () => {
      setIsDesktop(window.innerWidth >= 1180);
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { chatWidth?: number; logWidth?: number };
      if (typeof parsed.chatWidth === "number") {
        setChatWidth(clamp(parsed.chatWidth, CHAT_MIN_WIDTH, CHAT_MAX_WIDTH));
      }
      if (typeof parsed.logWidth === "number") {
        setLogWidth(clamp(parsed.logWidth, LOG_MIN_WIDTH, LOG_MAX_WIDTH));
      }
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isDesktop) return;
    const payload = JSON.stringify({ chatWidth, logWidth });
    localStorage.setItem(LAYOUT_STORAGE_KEY, payload);
  }, [chatWidth, isDesktop, logWidth]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      if (drag.mode === "chat") {
        const target = event.clientX - drag.rectLeft;
        const maxChat = Math.max(
          CHAT_MIN_WIDTH,
          Math.min(CHAT_MAX_WIDTH, drag.rectRight - drag.rectLeft - LOG_MIN_WIDTH - 500),
        );
        setChatWidth(clamp(target, CHAT_MIN_WIDTH, maxChat));
        return;
      }

      const fromRight = drag.rectRight - event.clientX;
      const maxLog = Math.max(
        LOG_MIN_WIDTH,
        Math.min(LOG_MAX_WIDTH, drag.rectRight - drag.rectLeft - CHAT_MIN_WIDTH - 500),
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

  const handleSend = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      setError(null);
      setLastPrompt(prompt);
      setRunStatus("queued");
      setRunError(null);
      setActiveIssueId(null);
      setActiveProposalId(null);
      setPreviewHtmlOverride(null);
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

        setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev));

        const planRes = await fetch(`${API_BASE}/${sessionId}/plan-draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        if (planRes.ok) {
          const planPayload = (await planRes.json().catch(() => null)) as
            | { mode?: string; summary?: string; checklist?: string[] }
            | null;
          if (planPayload?.summary) {
            const checklist = Array.isArray(planPayload.checklist) ? planPayload.checklist.join(" / ") : "";
            setSession((prev) =>
              prev
                ? {
                    ...prev,
                    messages: [
                      ...prev.messages,
                      {
                        id: makeId(),
                        role: "system",
                        content: `🗺️ 기획 초안(${planPayload.mode ?? "unknown"}): ${planPayload.summary}${checklist ? ` · ${checklist}` : ""}`,
                        timestamp: Date.now(),
                      },
                    ],
                  }
                : prev,
            );
          }
        }

        const res = await fetch(`${API_BASE}/${sessionId}/prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, auto_qa: true, stream: false }),
        });

        const queuedPayload = (await res.json().catch(() => ({}))) as { run_id?: string; status?: RunStatus };
        if (!res.ok) {
          throw new Error(normalizeError(queuedPayload));
        }
        const queuedRunId = String(queuedPayload.run_id || "");
        if (!queuedRunId) {
          throw new Error("run_id_missing");
        }

        setRunId(queuedRunId);
        setRunStatus((queuedPayload.status ?? "queued") as RunStatus);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    id: makeId(),
                    role: "system",
                    content: `⏳ 실행 대기열 등록: ${queuedRunId}`,
                    timestamp: Date.now(),
                  },
                ],
              }
            : prev,
        );

        const runResult = await pollRun(sessionId, queuedRunId);
        await refreshActivitiesFromEvents(sessionId);

        if (runResult.status === "succeeded") {
          const snapshot = await fetchSessionSnapshot(sessionId);
          setSession((prev) => {
            if (!prev) return prev;
            const nextHtml = snapshot?.current_html ?? runResult.current_html ?? prev.html;
            if (prev.html.trim() && prev.html !== nextHtml) {
              setHtmlHistory((history) => [...history.slice(-9), prev.html]);
            }
            const score = typeof snapshot?.score === "number" ? snapshot.score : runResult.final_score ?? prev.score;
            const activityMessages: ChatMessage[] = (runResult.activities ?? []).map((activity) => ({
              id: makeId(),
              role: activityRole(activity.agent),
              content: summarizeActivity(activity),
              timestamp: Date.now(),
            }));
            return {
              ...prev,
              html: nextHtml,
              score,
              status: snapshot?.status ?? "active",
              messages: [
                ...prev.messages,
                ...activityMessages,
                {
                  id: makeId(),
                    role: "assistant",
                    content: `✅ 실행 완료 (점수: ${score}/100)`,
                    timestamp: Date.now(),
                  },
                ],
              activities: runResult.activities ?? prev.activities,
            };
          });
          setRunStatus("succeeded");
          setRunError(null);
          return;
        }

        const failure = runResult.error_code
          ? `${runResult.error_code}${runResult.error_detail ? ` · ${runResult.error_detail}` : ""}`
          : runResult.error_detail || "run_failed";
        setRunError(failure);
        setError(failure);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    id: makeId(),
                    role: "system",
                    content: `⚠️ 실행 실패: ${failure}`,
                    timestamp: Date.now(),
                  },
                ],
              }
            : prev,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        setRunStatus("failed");
        setRunError(msg);
        const diagnostics = activeSessionId ? await loadRecentEvents(activeSessionId) : [];
        const nextActivities = diagnostics
          .map((event) => normalizeActivityFromEvent(event))
          .filter((row): row is AgentActivity => Boolean(row));
        setError(msg);
        setSession((prev) => {
          if (!prev) return prev;
          const diagnosticMessages: ChatMessage[] = diagnostics.slice(-4).map((event) => ({
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
                    content: `⚠️ 코어 엔진 응답 오류: ${msg}`,
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
    [ensureSession, fetchSessionSnapshot, loadRecentEvents, pollRun, refreshActivitiesFromEvents],
  );

  const handleCancelRun = useCallback(async () => {
    if (!session?.id || !runId || runStatus !== "running") return;
    await fetch(`${API_BASE}/${session.id}/runs/${runId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setRunStatus("cancelled");
    setRunError("prompt_run_cancelled");
  }, [runId, runStatus, session?.id]);

  const handleReportIssue = useCallback(async () => {
    if (!session?.id || !issueDraft.trim()) return;
    setIsIssueBusy(true);
    try {
      const title = issueDraft.trim().slice(0, 80);
      const response = await fetch(`${API_BASE}/${session.id}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          details: issueDraft.trim(),
          category: issueCategory,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as IssueCreateResponse;
      if (!response.ok) throw new Error(normalizeError(payload));
      setActiveIssueId(payload.issue_id);
      setActiveProposalId(null);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: makeId(),
                  role: "system",
                  content: `🧩 이슈 등록 완료 (${ISSUE_CATEGORY_LABELS[issueCategory]}) · issue_id=${payload.issue_id}`,
                  timestamp: Date.now(),
                },
              ],
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "issue_create_failed");
    } finally {
      setIsIssueBusy(false);
    }
  }, [issueCategory, issueDraft, session?.id]);

  const handleProposeFix = useCallback(async () => {
    if (!session?.id || !activeIssueId) return;
    setIsIssueBusy(true);
    try {
      const response = await fetch(`${API_BASE}/${session.id}/issues/${activeIssueId}/propose-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: issueDraft.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ProposalResponse;
      if (!response.ok) throw new Error(normalizeError(payload));
      setActiveProposalId(payload.proposal_id);
      setPreviewHtmlOverride(payload.preview_html);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: makeId(),
                  role: "assistant",
                  content: `🛠 수정안 생성 완료 · proposal_id=${payload.proposal_id} (미리보기 반영)`,
                  timestamp: Date.now(),
                },
              ],
            }
          : prev,
      );
      await refreshActivitiesFromEvents(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "fix_propose_failed");
    } finally {
      setIsIssueBusy(false);
    }
  }, [activeIssueId, issueDraft, refreshActivitiesFromEvents, session?.id]);

  const handleApplyFix = useCallback(async () => {
    if (!session?.id || !activeIssueId) return;
    setIsIssueBusy(true);
    try {
      const response = await fetch(`${API_BASE}/${session.id}/issues/${activeIssueId}/apply-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal_id: activeProposalId }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApplyFixResponse;
      if (!response.ok) throw new Error(normalizeError(payload));

      setPreviewHtmlOverride(null);
      setSession((prev) => {
        if (!prev) return prev;
        if (prev.html.trim() && prev.html !== payload.html) {
          setHtmlHistory((history) => [...history.slice(-9), prev.html]);
        }
        return {
          ...prev,
          html: payload.html,
          messages: [
            ...prev.messages,
            {
              id: makeId(),
              role: "system",
              content: "✅ 수정안 적용 완료",
              timestamp: Date.now(),
            },
          ],
        };
      });
      await refreshActivitiesFromEvents(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "fix_apply_failed");
    } finally {
      setIsIssueBusy(false);
    }
  }, [activeIssueId, activeProposalId, refreshActivitiesFromEvents, session?.id]);

  const handleApprovePublish = useCallback(async () => {
    if (!session?.id) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/${session.id}/approve-publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "editor 승인" }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(normalizeError(payload));
      }
      setSession((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: makeId(),
                  role: "system",
                  content: "✅ 퍼블리시 승인 완료",
                  timestamp: Date.now(),
                },
              ],
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "approve_publish_failed");
    } finally {
      setIsGenerating(false);
    }
  }, [session?.id]);

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
      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: "published",
              messages: [
                ...prev.messages,
                {
                  id: makeId(),
                  role: "system",
                  content: `🎉 퍼블리시 성공 → ${gameUrl}`,
                  timestamp: Date.now(),
                },
              ],
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "퍼블리시 실패");
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
    void handleSend("현재 게임 플레이는 유지하고 품질 이슈만 다시 검사해서 개선해줘.");
  }, [handleSend, isGenerating, session?.id]);

  const handleRestorePrevious = useCallback(() => {
    setPreviewHtmlOverride(null);
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
        <h2>🕹 세션 에디터</h2>
        <div className="editor-header-actions">
          <span className="editor-loop-badge">Codegen · Visual QA · Playtester 루프</span>
          {session?.score ? <span className="editor-score">품질 점수: {session.score}/100</span> : null}
          <button type="button" className="button button-ghost" disabled={!session?.id || isGenerating} onClick={handleApprovePublish}>
            ✅ 퍼블리시 승인
          </button>
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
        <GamePreview html={previewHtmlOverride ?? session?.html ?? ""} />
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
          runStatus={runStatus}
          runId={runId}
          runError={runError}
          isBusy={isGenerating}
          onCancelRun={handleCancelRun}
          onRetryLast={handleRetryLast}
          onRerunQa={handleRerunQa}
          onRestorePrevious={handleRestorePrevious}
          issueDraft={issueDraft}
          issueCategory={issueCategory}
          onIssueDraftChange={setIssueDraft}
          onIssueCategoryChange={setIssueCategory}
          onReportIssue={handleReportIssue}
          onProposeFix={handleProposeFix}
          onApplyFix={handleApplyFix}
          issueBusy={isIssueBusy}
          canProposeFix={Boolean(activeIssueId)}
          canApplyFix={Boolean(activeIssueId && activeProposalId)}
        />
      </div>
    </div>
  );
}
