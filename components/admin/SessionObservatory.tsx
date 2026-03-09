"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { EventTimelinePane, type TimelineEvent } from "@/components/admin/event-timeline-pane";
import { ObservatoryFilters } from "@/components/admin/observatory-filters";
import { ObservatoryHeader } from "@/components/admin/observatory-header";
import { QueueSummaryPane } from "@/components/admin/queue-summary-pane";
import { SessionListPane } from "@/components/admin/session-list-pane";
import { Card } from "@/components/ui/card";
import { PREVIEW_SESSION_EVENTS, PREVIEW_SESSIONS } from "@/lib/demo/preview-data";

type SessionSummary = {
  session_id: string;
  title: string;
  genre: string;
  status: string;
  score: number;
  updated_at?: string | null;
  created_at?: string | null;
};

type SessionEvent = TimelineEvent;

type SessionEventsResponse = {
  events: SessionEvent[];
};

type SessionListResponse = {
  sessions: SessionSummary[];
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  active: "작업 중",
  published: "퍼블리시 완료",
  cancelled: "취소됨",
  failed: "실패",
  idle: "대기",
};

const RUN_STATUS_LABELS: Record<string, string> = {
  idle: "대기",
  queued: "대기열",
  running: "실행 중",
  succeeded: "완료",
  failed: "실패",
  cancelled: "취소됨",
};

const AGENT_LABELS: Record<string, string> = {
  codegen: "코드젠",
  visual_qa: "비주얼 QA",
  playtester: "플레이테스터",
};

const ACTION_LABELS: Record<string, string> = {
  generate: "생성",
  modify: "수정",
  evaluate: "평가",
  test: "테스트",
  refine: "개선",
  run: "실행",
  publish: "퍼블리시",
  create: "생성",
  approve: "승인",
  audit: "감사",
};

const EVENT_LABELS: Record<string, string> = {
  issue_reported: "이슈 등록",
  fix_proposed: "수정안 제안",
  fix_applied: "수정안 적용",
  publish_blocked_unapproved: "승인 전 퍼블리시 차단",
  publish_blocked_presentation: "썸네일/프레젠테이션 차단",
  publish_approved: "퍼블리시 승인",
  publish_success: "퍼블리시 성공",
  prompt_run_queued: "실행 대기",
  prompt_run_started: "실행 시작",
  prompt_run_succeeded: "실행 성공",
  prompt_run_failed: "실행 실패",
  prompt_run_cancelled: "실행 취소",
  session_cancelled: "세션 취소",
  agent_activity: "에이전트 활동",
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const row = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    throw new Error(typeof row.error === "string" ? row.error : "요청 실패");
  }
  return payload as T;
}

function latestRunStatus(events: SessionEvent[]): string {
  const runEvent = events.find((event) =>
    ["prompt_run_failed", "prompt_run_succeeded", "prompt_run_cancelled", "prompt_run_started", "prompt_run_queued"].includes(event.event_type),
  );
  if (!runEvent) return "idle";
  if (runEvent.event_type === "prompt_run_failed") return "failed";
  if (runEvent.event_type === "prompt_run_succeeded") return "succeeded";
  if (runEvent.event_type === "prompt_run_cancelled") return "cancelled";
  if (runEvent.event_type === "prompt_run_started") return "running";
  return "queued";
}

function labelForStatus(status: string): string {
  return SESSION_STATUS_LABELS[status] ?? status;
}

function labelForRunStatus(status: string): string {
  return RUN_STATUS_LABELS[status] ?? status;
}

function labelForAgent(agent: string | null | undefined, eventType: string): string {
  if (agent) return AGENT_LABELS[agent] ?? agent;
  return EVENT_LABELS[eventType] ?? eventType;
}

function labelForAction(action: string | null | undefined): string {
  if (!action) return "이벤트";
  return ACTION_LABELS[action] ?? action;
}

function labelForEvent(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR", { hour12: false });
}

export function SessionObservatory({ previewMode = false }: { previewMode?: boolean }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [eventsBySession, setEventsBySession] = useState<Record<string, SessionEvent[]>>({});
  const [error, setError] = useState<string>("");

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [errorFilter, setErrorFilter] = useState<string>("");

  const loadSessions = useCallback(async () => {
    if (previewMode) {
      const previewRows = PREVIEW_SESSIONS.map((row) => ({
        session_id: row.session_id,
        title: row.title,
        genre: row.genre,
        status: row.status,
        score: row.score,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
      setSessions(previewRows);
      if (!selectedSessionId && previewRows.length > 0) {
        setSelectedSessionId(previewRows[0].session_id);
      }
      const previewEventMap = Object.fromEntries(previewRows.map((row) => [row.session_id, (PREVIEW_SESSION_EVENTS[row.session_id] ?? []) as SessionEvent[]]));
      setEventsBySession(previewEventMap);
      return;
    }

    const payload = await fetchJson<SessionListResponse>("/api/sessions?limit=50");
    const rows = Array.isArray(payload.sessions) ? payload.sessions : [];
    setSessions(rows);
    if (!selectedSessionId && rows.length > 0) {
      setSelectedSessionId(rows[0].session_id);
    }

    const eventEntries = await Promise.all(
      rows.slice(0, 30).map(async (session) => {
        try {
          const eventPayload = await fetchJson<SessionEventsResponse>(`/api/sessions/${encodeURIComponent(session.session_id)}/events?limit=140`);
          const eventRows = Array.isArray(eventPayload.events) ? eventPayload.events : [];
          return [session.session_id, eventRows] as const;
        } catch {
          return [session.session_id, []] as const;
        }
      }),
    );

    const nextEventsMap: Record<string, SessionEvent[]> = {};
    eventEntries.forEach(([sessionId, items]) => {
      nextEventsMap[sessionId] = [...items];
    });
    setEventsBySession(nextEventsMap);
  }, [previewMode, selectedSessionId]);

  const loadSelectedEvents = useCallback(async () => {
    if (!selectedSessionId) {
      setEvents([]);
      return;
    }
    if (previewMode) {
      setEvents((PREVIEW_SESSION_EVENTS[selectedSessionId] ?? []) as SessionEvent[]);
      return;
    }
    const payload = await fetchJson<SessionEventsResponse>(`/api/sessions/${encodeURIComponent(selectedSessionId)}/events?limit=180`);
    setEvents(Array.isArray(payload.events) ? payload.events : []);
  }, [previewMode, selectedSessionId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await loadSessions();
        if (!cancelled) setError("");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "세션 목록 로드 실패");
      }
    };

    void run();
    const timer = previewMode ? null : window.setInterval(() => void run(), 5000);
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [loadSessions, previewMode]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await loadSelectedEvents();
        if (!cancelled) setError("");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "이벤트 로드 실패");
      }
    };

    void run();
    const timer = previewMode ? null : window.setInterval(() => void run(), 2600);
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [loadSelectedEvents, previewMode]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (agentFilter && event.agent !== agentFilter) return false;
      if (actionFilter && event.action !== actionFilter) return false;
      if (errorFilter === "has_error" && !event.error_code) return false;
      if (errorFilter === "no_error" && event.error_code) return false;
      return true;
    });
  }, [actionFilter, agentFilter, errorFilter, events]);

  const visibleSessions = useMemo(() => {
    return sessions.filter((session) => (statusFilter ? session.status === statusFilter : true));
  }, [sessions, statusFilter]);

  const runBoard = useMemo(() => {
    return visibleSessions.map((session) => {
      const items = eventsBySession[session.session_id] ?? [];
      return {
        ...session,
        runStatus: latestRunStatus(items),
        latestError: items.find((item) => item.error_code)?.error_code ?? null,
      };
    });
  }, [eventsBySession, visibleSessions]);

  const issueQueue = useMemo(() => filteredEvents.filter((event) => ["issue_reported", "fix_proposed", "fix_applied"].includes(event.event_type)).slice(0, 12), [filteredEvents]);
  const approvalQueue = useMemo(
    () => filteredEvents.filter((event) => ["publish_blocked_unapproved", "publish_approved", "publish_success"].includes(event.event_type)).slice(0, 12),
    [filteredEvents],
  );

  const selectedSession = sessions.find((session) => session.session_id === selectedSessionId) ?? null;

  return (
    <section className="grid gap-5">
      <ObservatoryHeader totalSessions={sessions.length} selectedTitle={selectedSession?.title ?? null} />
      {error ? <Card className="rounded-[1rem] border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</Card> : null}
      <ObservatoryFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        agentFilter={agentFilter}
        setAgentFilter={setAgentFilter}
        actionFilter={actionFilter}
        setActionFilter={setActionFilter}
        errorFilter={errorFilter}
        setErrorFilter={setErrorFilter}
      />
      <section className="grid gap-5 xl:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.2fr)_minmax(18rem,0.62fr)]">
        <SessionListPane
          items={runBoard.map((session) => ({ session_id: session.session_id, title: session.title, status: session.status, runStatus: session.runStatus, latestError: session.latestError }))}
          selectedSessionId={selectedSessionId}
          onSelect={setSelectedSessionId}
          labelForStatus={labelForStatus}
          labelForRunStatus={labelForRunStatus}
        />
        <EventTimelinePane
          events={filteredEvents}
          selectedTitle={selectedSession?.title ?? null}
          formatDateTime={formatDateTime}
          labelForAgent={labelForAgent}
          labelForAction={labelForAction}
          labelForEvent={labelForEvent}
        />
        <div className="grid gap-5">
          <QueueSummaryPane title="수정 요청 흐름" count={issueQueue.length} events={issueQueue} labelForEvent={labelForEvent} />
          <QueueSummaryPane title="퍼블리시 흐름" count={approvalQueue.length} events={approvalQueue} labelForEvent={labelForEvent} />
        </div>
      </section>
    </section>
  );
}
