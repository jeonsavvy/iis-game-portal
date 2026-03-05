"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

type SessionEvent = {
  id: string;
  session_id: string;
  event_type: string;
  agent?: string | null;
  action?: string | null;
  summary?: string;
  score?: number | null;
  before_score?: number | null;
  after_score?: number | null;
  decision_reason?: string;
  input_signal?: string;
  change_impact?: string;
  confidence?: number | null;
  error_code?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

type SessionEventsResponse = {
  events: SessionEvent[];
};

type SessionListResponse = {
  sessions: SessionSummary[];
};

type SessionObservatoryProps = {
  previewMode?: boolean;
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
  publish_approved: "퍼블리시 승인",
  publish_success: "퍼블리시 성공",
  prompt_run_queued: "실행 대기",
  prompt_run_started: "실행 시작",
  prompt_run_succeeded: "실행 성공",
  prompt_run_failed: "실행 실패",
  prompt_run_cancelled: "실행 취소",
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const row = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    throw new Error(typeof row.error === "string" ? row.error : "요청 실패");
  }
  return payload as T;
}

function latestRunStatus(events: SessionEvent[]): string {
  const runEvent = events.find((event) =>
    ["prompt_run_failed", "prompt_run_succeeded", "prompt_run_cancelled", "prompt_run_started", "prompt_run_queued"].includes(
      event.event_type,
    ),
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

export function SessionObservatory({ previewMode = false }: SessionObservatoryProps) {
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
      const previewEventMap = Object.fromEntries(
        previewRows.map((row) => [row.session_id, (PREVIEW_SESSION_EVENTS[row.session_id] ?? []) as SessionEvent[]]),
      );
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
          const eventPayload = await fetchJson<SessionEventsResponse>(
            `/api/sessions/${encodeURIComponent(session.session_id)}/events?limit=140`,
          );
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
    const payload = await fetchJson<SessionEventsResponse>(
      `/api/sessions/${encodeURIComponent(selectedSessionId)}/events?limit=180`,
    );
    setEvents(Array.isArray(payload.events) ? payload.events : []);
  }, [previewMode, selectedSessionId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await loadSessions();
        if (!cancelled) setError("");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "세션 목록 로드 실패");
        }
      }
    };

    void run();
    const timer = previewMode
      ? null
      : window.setInterval(() => {
          void run();
        }, 5000);

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
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "이벤트 로드 실패");
        }
      }
    };

    void run();
    const timer = previewMode
      ? null
      : window.setInterval(() => {
          void run();
        }, 2600);

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

  const issueQueue = useMemo(() => {
    return filteredEvents.filter((event) => ["issue_reported", "fix_proposed", "fix_applied"].includes(event.event_type)).slice(0, 12);
  }, [filteredEvents]);

  const approvalQueue = useMemo(() => {
    return filteredEvents
      .filter((event) => ["publish_blocked_unapproved", "publish_approved", "publish_success"].includes(event.event_type))
      .slice(0, 12);
  }, [filteredEvents]);

  const selectedSession = sessions.find((session) => session.session_id === selectedSessionId) ?? null;

  return (
    <section className="console-page observatory-page">
      <section className="surface console-hero observatory-hero">
        <h1 className="hero-title observatory-title">🎛️ 세션 운영실</h1>
        <p className="muted-text observatory-subtitle">세션별 실행 상태와 에이전트 이벤트를 한 화면에서 확인합니다.</p>
        <div className="observatory-chips">
          <span className="observatory-chip">세션 {sessions.length}개</span>
          {selectedSession ? <span className="observatory-chip">선택: {selectedSession.title}</span> : null}
        </div>
      </section>

      {error ? <section className="surface observatory-error">{error}</section> : null}

      <section className="surface observatory-shell">
        <div className="observatory-filter-grid">
          <label>
            상태
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">전체</option>
              <option value="active">작업 중</option>
              <option value="published">퍼블리시 완료</option>
              <option value="cancelled">취소됨</option>
            </select>
          </label>
          <label>
            에이전트
            <select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
              <option value="">전체</option>
              <option value="codegen">코드젠</option>
              <option value="visual_qa">비주얼 QA</option>
              <option value="playtester">플레이테스터</option>
            </select>
          </label>
          <label>
            작업 단계
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
              <option value="">전체</option>
              <option value="generate">생성</option>
              <option value="modify">수정</option>
              <option value="evaluate">평가</option>
              <option value="test">테스트</option>
              <option value="refine">개선</option>
              <option value="run">실행</option>
              <option value="publish">퍼블리시</option>
            </select>
          </label>
          <label>
            오류 여부
            <select value={errorFilter} onChange={(event) => setErrorFilter(event.target.value)}>
              <option value="">전체</option>
              <option value="has_error">오류만</option>
              <option value="no_error">오류 제외</option>
            </select>
          </label>
        </div>

        <div className="observatory-main-grid">
          <div className="observatory-session-list">
            <h3 style={{ margin: 0 }}>세션 목록</h3>
            {runBoard.map((session) => (
              <button
                key={session.session_id}
                type="button"
                onClick={() => setSelectedSessionId(session.session_id)}
                className="card observatory-session-card"
                aria-pressed={selectedSessionId === session.session_id}
                style={{
                  textAlign: "left",
                  borderColor: selectedSessionId === session.session_id ? "#f472b6" : "transparent",
                }}
              >
                <strong>{session.title}</strong>
                <p style={{ margin: "4px 0 0" }}>
                  {labelForStatus(session.status)} · 점수 {session.score}
                </p>
                <small>
                  실행 상태: {labelForRunStatus(session.runStatus)}
                  {session.latestError ? ` · 최근 오류: ${session.latestError}` : ""}
                </small>
              </button>
            ))}
            {runBoard.length === 0 ? <p className="observatory-empty">세션이 없습니다.</p> : null}
          </div>

          <div className="observatory-event-list">
            <h3 style={{ margin: 0 }}>이벤트 타임라인 {selectedSession ? `· ${selectedSession.title}` : ""}</h3>
            {filteredEvents.map((event) => (
              <article key={event.id} className="card observatory-event-card">
                <strong>
                  [{labelForAgent(event.agent, event.event_type)}] {labelForAction(event.action)}
                </strong>
                <small>
                  {formatDateTime(event.created_at)} · {labelForEvent(event.event_type)}
                </small>
                {event.summary ? <p style={{ margin: 0 }}>{event.summary}</p> : null}
                {event.input_signal ? <p style={{ margin: 0 }}>입력: {event.input_signal}</p> : null}
                {event.decision_reason ? <p style={{ margin: 0 }}>판단 근거: {event.decision_reason}</p> : null}
                {event.change_impact ? <p style={{ margin: 0 }}>영향: {event.change_impact}</p> : null}
                {event.before_score !== null && event.after_score !== null ? (
                  <p style={{ margin: 0 }}>
                    점수 변화: {event.before_score} → {event.after_score}
                  </p>
                ) : null}
                {typeof event.confidence === "number" ? <p style={{ margin: 0 }}>신뢰도: {event.confidence.toFixed(2)}</p> : null}
                {event.error_code ? <p style={{ margin: 0, color: "#fca5a5" }}>오류 코드: {event.error_code}</p> : null}
              </article>
            ))}
            {filteredEvents.length === 0 ? <p className="observatory-empty">표시할 이벤트가 없습니다.</p> : null}
          </div>
        </div>

        <div className="observatory-queue-grid">
          <section className="card observatory-queue-card">
            <h4>🧩 협업 수정 흐름</h4>
            {issueQueue.length === 0 ? (
              <p className="observatory-empty">등록된 협업 수정 이벤트가 없습니다.</p>
            ) : (
              issueQueue.map((event) => (
                <p key={event.id}>
                  [{labelForEvent(event.event_type)}] {event.summary}
                </p>
              ))
            )}
          </section>
          <section className="card observatory-queue-card">
            <h4>✅ 퍼블리시 승인 흐름</h4>
            {approvalQueue.length === 0 ? (
              <p className="observatory-empty">승인/퍼블리시 이벤트가 없습니다.</p>
            ) : (
              approvalQueue.map((event) => (
                <p key={event.id}>
                  [{labelForEvent(event.event_type)}] {event.summary}
                </p>
              ))
            )}
          </section>
        </div>
      </section>
    </section>
  );
}
