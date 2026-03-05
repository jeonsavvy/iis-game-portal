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
  created_at: string;
};

type SessionEventsResponse = {
  events: SessionEvent[];
  next_cursor?: string | null;
};

type SessionListResponse = {
  sessions: SessionSummary[];
};

type SessionMetric = {
  refineCount: number;
  qaFailCount: number;
  qaTotal: number;
  modelErrorCount: number;
  eventCount: number;
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

function buildMetrics(events: SessionEvent[]): SessionMetric {
  const refineCount = events.filter((event) => event.action === "refine").length;
  const qaEvents = events.filter((event) => event.agent === "visual_qa" || event.agent === "playtester");
  const qaFailCount = qaEvents.filter((event) => {
    const impact = (event.change_impact || "").toLowerCase();
    return impact.includes("issue") || impact.includes("failed") || impact.includes("below");
  }).length;
  const modelErrorCount = events.filter((event) => Boolean(event.error_code)).length;
  return {
    refineCount,
    qaFailCount,
    qaTotal: qaEvents.length,
    modelErrorCount,
    eventCount: events.length,
  };
}

type SessionObservatoryProps = {
  previewMode?: boolean;
};

export function SessionObservatory({ previewMode = false }: SessionObservatoryProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [metricsBySession, setMetricsBySession] = useState<Record<string, SessionMetric>>({});
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
      const previewMetrics = Object.fromEntries(
        previewRows.map((row) => {
          const items = PREVIEW_SESSION_EVENTS[row.session_id] ?? [];
          return [row.session_id, buildMetrics(items as SessionEvent[])];
        }),
      );
      setMetricsBySession(previewMetrics);
      return;
    }

    const payload = await fetchJson<SessionListResponse>("/api/sessions?limit=50");
    const rows = Array.isArray(payload.sessions) ? payload.sessions : [];
    setSessions(rows);

    if (!selectedSessionId && rows.length > 0) {
      setSelectedSessionId(rows[0].session_id);
    }

    const metricEntries = await Promise.all(
      rows.slice(0, 20).map(async (session) => {
        try {
          const eventPayload = await fetchJson<SessionEventsResponse>(
            `/api/sessions/${encodeURIComponent(session.session_id)}/events?limit=100`,
          );
          const metric = buildMetrics(Array.isArray(eventPayload.events) ? eventPayload.events : []);
          return [session.session_id, metric] as const;
        } catch {
          return [session.session_id, { refineCount: 0, qaFailCount: 0, qaTotal: 0, modelErrorCount: 0, eventCount: 0 }] as const;
        }
      }),
    );

    setMetricsBySession(Object.fromEntries(metricEntries));
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
      `/api/sessions/${encodeURIComponent(selectedSessionId)}/events?limit=120`,
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
        }, 3000);

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

  const kpi = useMemo(() => {
    const totalSessions = sessions.length;
    const published = sessions.filter((session) => session.status === "published").length;

    const metrics = Object.values(metricsBySession);
    const refineTotal = metrics.reduce((acc, row) => acc + row.refineCount, 0);
    const qaTotal = metrics.reduce((acc, row) => acc + row.qaTotal, 0);
    const qaFail = metrics.reduce((acc, row) => acc + row.qaFailCount, 0);
    const modelErr = metrics.reduce((acc, row) => acc + row.modelErrorCount, 0);
    const eventTotal = metrics.reduce((acc, row) => acc + row.eventCount, 0);

    return {
      avgRefine: totalSessions ? refineTotal / totalSessions : 0,
      qaFailureRate: qaTotal ? (qaFail / qaTotal) * 100 : 0,
      publishSuccessRate: totalSessions ? (published / totalSessions) * 100 : 0,
      modelErrorRate: eventTotal ? (modelErr / eventTotal) * 100 : 0,
    };
  }, [metricsBySession, sessions]);

  const selectedSession = sessions.find((session) => session.session_id === selectedSessionId) ?? null;

  return (
    <section className="console-page" style={{ display: "grid", gap: 16 }}>
      <section className="surface console-hero" style={{ display: "grid", gap: 8 }}>
        <h1 className="hero-title" style={{ margin: 0 }}>Session Observatory</h1>
        <p className="muted-text" style={{ margin: 0 }}>
          Session-first 멀티에이전트 이벤트 관제실
        </p>
      </section>

      {error ? (
        <section className="surface" style={{ color: "#fecaca" }}>
          {error}
        </section>
      ) : null}

      <section className="surface" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>KPI</h2>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div className="card"><strong>{kpi.avgRefine.toFixed(2)}</strong><p>세션당 평균 refine 횟수</p></div>
          <div className="card"><strong>{kpi.qaFailureRate.toFixed(1)}%</strong><p>QA 실패율</p></div>
          <div className="card"><strong>{kpi.publishSuccessRate.toFixed(1)}%</strong><p>Publish 성공률</p></div>
          <div className="card"><strong>{kpi.modelErrorRate.toFixed(1)}%</strong><p>모델 오류율</p></div>
        </div>
      </section>

      <section className="surface" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <label>
            상태
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">전체</option>
              <option value="active">active</option>
              <option value="published">published</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
          <label>
            agent
            <select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
              <option value="">전체</option>
              <option value="codegen">codegen</option>
              <option value="visual_qa">visual_qa</option>
              <option value="playtester">playtester</option>
            </select>
          </label>
          <label>
            action
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
              <option value="">전체</option>
              <option value="generate">generate</option>
              <option value="modify">modify</option>
              <option value="evaluate">evaluate</option>
              <option value="test">test</option>
              <option value="refine">refine</option>
              <option value="publish">publish</option>
            </select>
          </label>
          <label>
            error
            <select value={errorFilter} onChange={(event) => setErrorFilter(event.target.value)}>
              <option value="">전체</option>
              <option value="has_error">error only</option>
              <option value="no_error">non-error only</option>
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(240px, 320px) 1fr" }}>
          <div style={{ display: "grid", gap: 8, maxHeight: 520, overflow: "auto" }}>
            {visibleSessions.map((session) => (
              <button
                key={session.session_id}
                type="button"
                onClick={() => setSelectedSessionId(session.session_id)}
                className="card"
                aria-pressed={selectedSessionId === session.session_id}
                style={{
                  textAlign: "left",
                  borderColor: selectedSessionId === session.session_id ? "#60a5fa" : "transparent",
                }}
              >
                <strong>{session.title}</strong>
                <p style={{ margin: "4px 0 0" }}>{session.status} · score {session.score}</p>
                <small>{session.session_id}</small>
              </button>
            ))}
            {visibleSessions.length === 0 ? <p>세션이 없습니다.</p> : null}
          </div>

          <div style={{ display: "grid", gap: 8, maxHeight: 520, overflow: "auto" }}>
            <h3 style={{ margin: 0 }}>
              Event Timeline {selectedSession ? `· ${selectedSession.title}` : ""}
            </h3>
            {filteredEvents.map((event) => (
              <article key={event.id} className="card" style={{ display: "grid", gap: 4 }}>
                <strong>
                  [{event.agent || event.event_type}] {event.action || "-"}
                </strong>
                <small>{event.created_at}</small>
                {event.summary ? <p style={{ margin: 0 }}>{event.summary}</p> : null}
                {event.input_signal ? <p style={{ margin: 0 }}>input: {event.input_signal}</p> : null}
                {event.decision_reason ? <p style={{ margin: 0 }}>why: {event.decision_reason}</p> : null}
                {event.change_impact ? <p style={{ margin: 0 }}>impact: {event.change_impact}</p> : null}
                {event.before_score !== null && event.after_score !== null ? (
                  <p style={{ margin: 0 }}>
                    score Δ: {event.before_score} → {event.after_score}
                  </p>
                ) : null}
                {typeof event.confidence === "number" ? <p style={{ margin: 0 }}>confidence: {event.confidence.toFixed(2)}</p> : null}
                {event.error_code ? <p style={{ margin: 0, color: "#fca5a5" }}>error_code: {event.error_code}</p> : null}
              </article>
            ))}
            {filteredEvents.length === 0 ? <p>표시할 이벤트가 없습니다.</p> : null}
          </div>
        </div>
      </section>
    </section>
  );
}
