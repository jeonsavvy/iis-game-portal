"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { type AgentActivity, type RunStatus } from "@/components/editor/AgentLogPanel";
import { ChatPanel, type ChatAttachment, type ChatMessage, type ChatSendPayload, type ChatAction } from "@/components/editor/ChatPanel";
import { GamePreview } from "@/components/editor/GamePreview";
import { isTransientCoreEnginePollFailure } from "@/lib/editor/run-polling";

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
  metadata?: Record<string, unknown>;
  created_at?: string;
};

type RunResponse = {
  run_id: string;
  status: RunStatus;
  error_code?: string | null;
  error_detail?: string;
  attempt_count?: number;
  retry_after_seconds?: number | null;
  model_name?: string | null;
  model_location?: string | null;
  fallback_used?: boolean;
  final_score?: number;
  current_html?: string;
  activities?: AgentActivity[];
};

type SessionFetchResponse = {
  session_id: string;
  status: string;
  current_html: string;
  score?: number;
  current_run_id?: string | null;
  current_run_status?: string | null;
  last_issue_id?: string | null;
  last_proposal_id?: string | null;
  last_preview_html?: string | null;
};

type IssueCreateResponse = {
  issue_id: string;
};

type ProposalResponse = {
  issue_id: string;
  proposal_id: string;
  preview_html: string;
};

type ConversationFetchResponse = {
  messages?: Array<{
    role?: string;
    content?: string;
    created_at?: string;
    metadata?: Record<string, unknown>;
  }>;
};

type LatestIssueFetchResponse = {
  issue?: {
    issue_id?: string;
    status?: string;
    category?: string;
    details?: string;
  } | null;
  proposal_id?: string | null;
  proposal_status?: string | null;
  preview_html?: string | null;
  routed_agents?: string[];
};

type ApplyFixResponse = {
  html: string;
  status: string;
};

const API_BASE = "/api/sessions";
const CHAT_MIN_WIDTH = 320;
const CHAT_MAX_WIDTH = 560;
const LAYOUT_STORAGE_KEY = "iis-editor-layout-v3";
const MAX_TRANSIENT_POLL_FAILURES = 8;
const LAST_SESSION_STORAGE_KEY = "iis-editor-last-session-v1";

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
  const lines = [
    `${activity.agent}/${activity.action}`,
    activity.summary || "처리 완료",
    activity.decision_reason ? `판단 근거: ${activity.decision_reason}` : "",
    activity.change_impact ? `변경 영향: ${activity.change_impact}` : "",
    typeof activity.metadata?.scaffold_key === "string" ? `기반 scaffold: ${activity.metadata.scaffold_key}` : "",
    typeof activity.metadata?.generation_mode === "string" ? `생성 모드: ${activity.metadata.generation_mode}` : "",
  ].filter(Boolean);
  return lines.join("\n");
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
    metadata: event.metadata,
  };
}

function normalizeChatRole(role: string | undefined): ChatMessage["role"] {
  if (role === "visual_qa") return "visual_qa";
  if (role === "playtester") return "playtester";
  if (role === "system") return "system";
  if (role === "assistant") return "assistant";
  return "user";
}

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  [...existing, ...incoming].forEach((message) => {
    byId.set(message.id, message);
  });
  return [...byId.values()].sort((left, right) => left.timestamp - right.timestamp);
}

function eventToChatMessage(event: SessionEvent): ChatMessage | null {
  const timestamp = Date.parse(String(event.created_at ?? "")) || Date.now();
  const scaffoldKey = typeof event.metadata?.scaffold_key === "string" ? event.metadata.scaffold_key : "";
  const generationMode = typeof event.metadata?.generation_mode === "string" ? event.metadata.generation_mode : "";

  if (event.event_type === "agent_activity" && event.agent) {
    const lines = [
      event.summary || `${event.agent} 작업`,
      event.decision_reason ? `판단 근거: ${event.decision_reason}` : "",
      event.change_impact ? `변경 영향: ${event.change_impact}` : "",
      scaffoldKey ? `기반 scaffold: ${scaffoldKey}` : "",
      generationMode ? `생성 모드: ${generationMode}` : "",
    ].filter(Boolean);
    return {
      id: `event-${event.id}`,
      role: activityRole(event.agent),
      content: lines.join("\n"),
      timestamp,
    };
  }

  if ([
    "plan_draft_created",
    "scaffold_materialized",
    "prompt_run_queued",
    "prompt_run_started",
    "prompt_run_model_selected",
    "prompt_run_capacity_fallback",
    "prompt_run_capacity_exhausted",
    "prompt_run_retry_scheduled",
    "prompt_run_succeeded",
    "prompt_run_failed",
    "fix_proposed",
    "fix_applied",
    "issue_reported",
    "publish_success",
    "publish_blocked_runtime",
    "scaffold_reverted_to_baseline",
  ].includes(event.event_type)) {
    const lines = [
      event.summary || event.event_type,
      event.error_code ? `오류 코드: ${event.error_code}` : "",
      scaffoldKey ? `기반 scaffold: ${scaffoldKey}` : "",
      generationMode ? `생성 모드: ${generationMode}` : "",
    ].filter(Boolean);
    return {
      id: `event-${event.id}`,
      role: "system",
      content: lines.join("\n"),
      timestamp,
    };
  }

  return null;
}

function normalizeAttachmentMetadata(metadata: Record<string, unknown> | undefined): ChatAttachment | null {
  const attachment = metadata?.attachment;
  if (!attachment || typeof attachment !== "object") return null;
  const row = attachment as Record<string, unknown>;
  const name = typeof row.name === "string" ? row.name : "attachment";
  const mimeType = typeof row.mime_type === "string" ? row.mime_type : "image/png";
  const dataUrl = typeof row.data_url === "string" ? row.data_url : undefined;
  return {
    name,
    mime_type: mimeType,
    data_url: dataUrl,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<SessionState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isIssueBusy, setIsIssueBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);
  const [chatWidth, setChatWidth] = useState(360);
  const [isDesktop, setIsDesktop] = useState(false);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [previewHtmlOverride, setPreviewHtmlOverride] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreWarning, setRestoreWarning] = useState<string | null>(null);

  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const restoredSessionRef = useRef<string | null>(null);
  const dragStateRef = useRef<{
    mode: "chat";
    rectLeft: number;
    rectRight: number;
  } | null>(null);

  const syncEditorUrl = useCallback(
    (sessionId: string, nextRunId?: string | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("session", sessionId);
      if (nextRunId && nextRunId.trim()) {
        params.set("run", nextRunId);
      } else {
        params.delete("run");
      }
      router.replace(`/editor?${params.toString()}`);
      if (typeof window !== "undefined") {
        localStorage.setItem(LAST_SESSION_STORAGE_KEY, sessionId);
      }
    },
    [router, searchParams],
  );

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
    syncEditorUrl(newId, null);
    return newId;
  }, [session, syncEditorUrl]);

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

  const fetchSessionSnapshotWithRetry = useCallback(async (sessionId: string): Promise<SessionFetchResponse | null> => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const snapshot = await fetchSessionSnapshot(sessionId);
      if (snapshot) return snapshot;
      await wait(500 * (attempt + 1));
    }
    return null;
  }, [fetchSessionSnapshot]);

  const fetchConversation = useCallback(async (sessionId: string): Promise<ChatMessage[]> => {
    const res = await fetch(`${API_BASE}/${sessionId}/conversation?limit=80`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const payload = (await res.json().catch(() => ({}))) as ConversationFetchResponse;
    if (!Array.isArray(payload.messages)) return [];
    return payload.messages.map((message, index) => ({
      id: `restore-${sessionId}-${index}-${message.created_at ?? "ts"}`,
      role: normalizeChatRole(message.role),
      content: String(message.content ?? ""),
      timestamp: Date.parse(String(message.created_at ?? "")) || Date.now() + index,
      attachment: normalizeAttachmentMetadata(message.metadata),
    }));
  }, []);

  const fetchLatestIssueSnapshot = useCallback(async (sessionId: string): Promise<LatestIssueFetchResponse | null> => {
    const res = await fetch(`${API_BASE}/${sessionId}/issues/latest`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as LatestIssueFetchResponse | null;
  }, []);

  const pollRun = useCallback(
    async (sessionId: string, queuedRunId: string): Promise<RunResponse> => {
      let attempt = 0;
      let transientFailures = 0;
      while (attempt < 180) {
        attempt += 1;
        try {
          const response = await fetch(`${API_BASE}/${sessionId}/runs/${queuedRunId}`, {
            method: "GET",
            cache: "no-store",
          });
          const payload = (await response.json().catch(() => ({}))) as RunResponse;
          if (!response.ok) {
            if (
              transientFailures < MAX_TRANSIENT_POLL_FAILURES &&
              isTransientCoreEnginePollFailure({ status: response.status, payload })
            ) {
              transientFailures += 1;
              setRunStatus("running");
              setRunError(`코어 엔진 재연결 대기 중 (${transientFailures}/${MAX_TRANSIENT_POLL_FAILURES})`);
              await wait(1500);
              continue;
            }
            throw new Error(normalizeError(payload));
          }

          transientFailures = 0;
          const nextStatus = (payload.status || "queued") as RunStatus;
          setRunStatus(nextStatus);
          setRunError(
            nextStatus === "retrying"
              ? `재시도 예정${typeof payload.retry_after_seconds === "number" ? ` · ${payload.retry_after_seconds}초 후` : ""}`
              : payload.error_code
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
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown_error";
          if (
            transientFailures < MAX_TRANSIENT_POLL_FAILURES &&
            isTransientCoreEnginePollFailure({ message })
          ) {
            transientFailures += 1;
            setRunStatus("running");
            setRunError(`코어 엔진 재연결 대기 중 (${transientFailures}/${MAX_TRANSIENT_POLL_FAILURES})`);
            await wait(1500);
            continue;
          }
          throw error;
        }
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
      const parsed = JSON.parse(raw) as { chatWidth?: number };
      if (typeof parsed.chatWidth === "number") {
        setChatWidth(clamp(parsed.chatWidth, CHAT_MIN_WIDTH, CHAT_MAX_WIDTH));
      }
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isDesktop) return;
    const payload = JSON.stringify({ chatWidth });
    localStorage.setItem(LAYOUT_STORAGE_KEY, payload);
  }, [chatWidth, isDesktop]);

  useEffect(() => {
    if (typeof window === "undefined" || !session?.id) return;
    localStorage.setItem(LAST_SESSION_STORAGE_KEY, session.id);
  }, [session?.id]);

  useEffect(() => {
    const sessionParam = searchParams?.get("session")?.trim();
    const runParam = searchParams?.get("run")?.trim();
    if (!sessionParam) return;

    if (session?.id === sessionParam && session.messages.length > 0) {
      if (runParam && runParam !== runId) {
        setRunId(runParam);
      }
      return;
    }

    const restoreKey = `${sessionParam}:${runParam ?? ""}`;
    if (restoredSessionRef.current === restoreKey) return;
    restoredSessionRef.current = restoreKey;

    let cancelled = false;
    const restore = async () => {
      setIsRestoring(true);
      try {
        const snapshot = await fetchSessionSnapshotWithRetry(sessionParam);
        if (!snapshot) {
          if (session?.id === sessionParam) {
            setRestoreWarning("세션 스냅샷을 다시 불러오지 못했지만 현재 화면은 유지했습니다.");
            return;
          }
          throw new Error("세션 스냅샷 복원에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
        if (cancelled) return;

        const [messagesResult, eventsResult, latestIssueResult] = await Promise.allSettled([
          fetchConversation(sessionParam),
          loadRecentEvents(sessionParam),
          fetchLatestIssueSnapshot(sessionParam),
        ]);

        const messages = messagesResult.status === "fulfilled" ? messagesResult.value : [];
        const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];
        const latestIssue = latestIssueResult.status === "fulfilled" ? latestIssueResult.value : null;
        if (messagesResult.status === "rejected" || eventsResult.status === "rejected" || latestIssueResult.status === "rejected") {
          const warnings: string[] = [];
          if (messagesResult.status === "rejected") warnings.push("대화 일부");
          if (eventsResult.status === "rejected") warnings.push("이벤트 일부");
          if (latestIssueResult.status === "rejected") warnings.push("수정안 일부");
          setRestoreWarning(`${warnings.join(", ")} 복원에 실패했지만 작업은 계속할 수 있습니다.`);
        } else {
          setRestoreWarning(null);
        }
        if (messagesResult.status === "rejected" || eventsResult.status === "rejected" || latestIssueResult.status === "rejected") {
          const warnings: string[] = [];
          if (messagesResult.status === "rejected") warnings.push("대화 일부");
          if (eventsResult.status === "rejected") warnings.push("이벤트 일부");
          if (latestIssueResult.status === "rejected") warnings.push("수정안 일부");
          setRestoreWarning(`${warnings.join(", ")} 복원에 실패했지만 작업은 계속할 수 있습니다.`);
        } else {
          setRestoreWarning(null);
        }

        const nextActivities = events
          .map((event) => normalizeActivityFromEvent(event))
          .filter((row): row is AgentActivity => Boolean(row));
        const eventMessages = events
          .map((event) => eventToChatMessage(event))
          .filter((row): row is ChatMessage => Boolean(row));
        const restoredRunId = runParam || snapshot.current_run_id || null;
        const inferredRunId = restoredRunId || null;

        setSession({
          id: snapshot.session_id,
          html: snapshot.current_html ?? "",
          score: typeof snapshot.score === "number" ? snapshot.score : 0,
          status: snapshot.status ?? "active",
          messages: mergeMessages(messages, eventMessages),
          activities: nextActivities,
        });
        setActiveIssueId(latestIssue?.issue?.issue_id ?? null);
        setActiveProposalId(latestIssue?.proposal_id ?? null);
        setPreviewHtmlOverride(latestIssue?.preview_html ?? snapshot.last_preview_html ?? null);
        setRunId(inferredRunId);
        setRunStatus(
          (snapshot.current_run_status &&
          ["idle", "queued", "running", "succeeded", "failed", "cancelled"].includes(snapshot.current_run_status)
            ? snapshot.current_run_status
            : "idle") as RunStatus,
        );

        if (restoredRunId && (snapshot.current_run_status === "queued" || snapshot.current_run_status === "running")) {
          void pollRun(sessionParam, restoredRunId);
        }
      } catch (err) {
        if (!cancelled && session?.id !== sessionParam) {
          setError(err instanceof Error ? err.message : "세션 스냅샷 복원에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
      } finally {
        if (!cancelled) {
          setIsRestoring(false);
        }
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [fetchConversation, fetchLatestIssueSnapshot, fetchSessionSnapshotWithRetry, loadRecentEvents, pollRun, runId, searchParams, session]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      if (drag.mode === "chat") {
        const target = event.clientX - drag.rectLeft;
        const maxChat = Math.max(CHAT_MIN_WIDTH, Math.min(CHAT_MAX_WIDTH, drag.rectRight - drag.rectLeft - 500));
        setChatWidth(clamp(target, CHAT_MIN_WIDTH, maxChat));
        return;
      }
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
    () => (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!isDesktop) return;
      const rect = workspaceRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragStateRef.current = {
        mode: "chat",
        rectLeft: rect.left,
        rectRight: rect.right,
      };
      document.body.classList.add("editor-resizing");
      event.preventDefault();
    },
    [isDesktop],
  );

  const pushMessage = useCallback((message: ChatMessage) => {
    setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : prev));
  }, []);

  const submitChatIssue = useCallback(
    async ({
      sessionId,
      prompt,
      attachment,
    }: {
      sessionId: string;
      prompt: string;
      attachment?: ChatAttachment | null;
    }) => {
      setIsIssueBusy(true);
      try {
        pushMessage({
          id: makeId(),
          role: "system",
          content: "🧩 피드백 접수됨 · 최적 에이전트가 수정 방향을 정리하는 중입니다.",
          timestamp: Date.now(),
        });

        const issueResponse = await fetch(`${API_BASE}/${sessionId}/issues`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: prompt.trim().slice(0, 80),
            details: prompt,
            image_attachment: attachment
              ? {
                  name: attachment.name,
                  mime_type: attachment.mime_type,
                  data_url: attachment.data_url,
                }
              : undefined,
          }),
        });
        const issuePayload = (await issueResponse.json().catch(() => ({}))) as IssueCreateResponse;
        if (!issueResponse.ok) throw new Error(normalizeError(issuePayload));
        setActiveIssueId(issuePayload.issue_id);
        setActiveProposalId(null);

        pushMessage({
          id: makeId(),
          role: "system",
          content: "🛠 수정안 생성 중... 프리뷰를 갱신할 준비를 합니다.",
          timestamp: Date.now(),
        });

        const proposeResponse = await fetch(`${API_BASE}/${sessionId}/issues/${issuePayload.issue_id}/propose-fix`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction: prompt,
            image_attachment: attachment
              ? {
                  name: attachment.name,
                  mime_type: attachment.mime_type,
                  data_url: attachment.data_url,
                }
              : undefined,
          }),
        });
        const proposePayload = (await proposeResponse.json().catch(() => ({}))) as ProposalResponse;
        if (!proposeResponse.ok) throw new Error(normalizeError(proposePayload));
        setActiveProposalId(proposePayload.proposal_id);
        setPreviewHtmlOverride(proposePayload.preview_html);
        pushMessage({
          id: makeId(),
          role: "assistant",
          content: "🛠 수정안 준비 완료 · 중앙 프리뷰에서 바로 확인하고, 마음에 들면 진단 레일에서 적용하세요.",
          timestamp: Date.now(),
        });
        await refreshActivitiesFromEvents(sessionId);
      } finally {
        setIsIssueBusy(false);
      }
    },
    [pushMessage, refreshActivitiesFromEvents],
  );

  const handleSend = useCallback(
    async ({ prompt, attachment, mode = "auto" }: ChatSendPayload) => {
      setIsGenerating(true);
      setError(null);
      setLastPrompt(prompt);
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
          attachment: attachment ?? null,
        };

        setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev));

        const shouldUseIssueFlow =
          mode === "issue" || (mode === "auto" && Boolean(session?.html.trim()));

        if (shouldUseIssueFlow) {
          await submitChatIssue({ sessionId, prompt, attachment });
          return;
        }

        setRunStatus("queued");
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
          body: JSON.stringify({
            prompt,
            auto_qa: true,
            stream: false,
            image_attachment: attachment
              ? {
                  name: attachment.name,
                  mime_type: attachment.mime_type,
                  data_url: attachment.data_url,
                }
              : undefined,
          }),
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
        syncEditorUrl(sessionId, queuedRunId);
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
            const activityMessages: ChatMessage[] = (runResult.activities ?? []).map((activity) => ({
              id: makeId(),
              role: activityRole(activity.agent),
              content: summarizeActivity(activity),
              timestamp: Date.now(),
            }));
            return {
              ...prev,
              html: nextHtml,
              score: typeof snapshot?.score === "number" ? snapshot.score : prev.score,
              status: snapshot?.status ?? "active",
              messages: [
                ...prev.messages,
                ...activityMessages,
                {
                  id: makeId(),
                  role: "assistant",
                  content: "✅ 실행 완료",
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
    [ensureSession, fetchSessionSnapshot, loadRecentEvents, pollRun, refreshActivitiesFromEvents, session?.html, submitChatIssue, syncEditorUrl],
  );

  const handleProposeFix = useCallback(async () => {
    if (!session?.id || !activeIssueId) return;
    setIsIssueBusy(true);
    try {
      const response = await fetch(`${API_BASE}/${session.id}/issues/${activeIssueId}/propose-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: lastPrompt.trim(),
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
  }, [activeIssueId, lastPrompt, refreshActivitiesFromEvents, session?.id]);

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
    void handleSend({ prompt: lastPrompt, mode: "generate" });
  }, [handleSend, isGenerating, lastPrompt]);

  const handleRerunQa = useCallback(() => {
    if (!session?.id || isGenerating) return;
    void handleSend({ prompt: "현재 게임 플레이는 유지하고 품질 이슈만 다시 검사해서 개선해줘.", mode: "issue" });
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

  const handleStartFreshSession = useCallback(() => {
    setSession(null);
    setRunId(null);
    setRunStatus("idle");
    setRunError(null);
    setActiveIssueId(null);
    setActiveProposalId(null);
    setPreviewHtmlOverride(null);
    setHtmlHistory([]);
    setError(null);
    setRestoreWarning(null);
    restoredSessionRef.current = null;
    router.replace("/editor");
  }, [router]);

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <h2>🕹 세션 에디터</h2>
        <div className="editor-header-actions">
          <span className="editor-loop-badge">Codegen · Visual QA · Playtester 루프</span>
          {runStatus !== "idle" ? <span className="editor-loop-badge">{runStatus}</span> : null}
          {runError && !error ? <span className="editor-loop-badge">진단: {runError}</span> : null}
          <button type="button" className="button button-ghost" onClick={handleStartFreshSession} disabled={isGenerating || isIssueBusy}>
            🆕 새 세션
          </button>
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

      {isRestoring && (
        <div className="editor-error" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#bfdbfe" }}>
          <p>세션 상태를 복원하는 중입니다...</p>
        </div>
      )}

      {restoreWarning && !error ? (
        <div className="editor-error" style={{ background: "rgba(250, 204, 21, 0.12)", color: "#fde68a" }}>
          <p>{restoreWarning}</p>
          <button type="button" onClick={() => setRestoreWarning(null)}>
            닫기
          </button>
        </div>
      ) : null}

        <div
        className="editor-workspace"
        ref={workspaceRef}
        style={
          isDesktop
            ? { gridTemplateColumns: `${chatWidth}px 8px minmax(0,1fr)` }
            : undefined
        }
      >
        <ChatPanel
          messages={session?.messages ?? []}
          onSend={handleSend}
          isGenerating={isGenerating}
          actions={[
            {
              id: "retry-last",
              label: "마지막 요청 재실행",
              onClick: handleRetryLast,
              disabled: !lastPrompt.trim() || isGenerating,
            },
            {
              id: "rerun-qa",
              label: "QA 다시 실행",
              onClick: handleRerunQa,
              disabled: !session?.id || isGenerating,
            },
            {
              id: "restore-previous",
              label: "직전 결과 복원",
              onClick: handleRestorePrevious,
              disabled: htmlHistory.length === 0,
            },
            {
              id: "propose-fix",
              label: "수정안 다시 생성",
              onClick: handleProposeFix,
              disabled: !activeIssueId || isIssueBusy,
            },
            {
              id: "apply-fix",
              label: "수정안 적용",
              onClick: handleApplyFix,
              disabled: !activeIssueId || !activeProposalId || isIssueBusy,
              tone: "primary",
            },
          ].filter(Boolean) as ChatAction[]}
        />
        {isDesktop ? (
          <div
            className="editor-resizer editor-resizer--chat"
            onMouseDown={startResize()}
            role="separator"
            aria-orientation="vertical"
            aria-label="채팅 패널 너비 조절"
          />
        ) : null}
        <div className="editor-stage">
          <GamePreview html={previewHtmlOverride ?? session?.html ?? ""} />
        </div>
      </div>
    </div>
  );
}
