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

type SessionMetric = {
  refineCount: number;
  qaFailCount: number;
  qaTotal: number;
  modelErrorCount: number;
  eventCount: number;
  runTotal: number;
  runFailCount: number;
  engineAuditCount: number;
  engineDriftCount: number;
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

function isEngineDrift(event: SessionEvent): boolean {
  if (event.event_type !== "engine_audit") return false;
  const metadata = event.metadata ?? {};
  const compliance = metadata.compliance;
  if (compliance === false) return true;
  const detected = typeof metadata.detected_engine === "string" ? metadata.detected_engine : "";
  return detected === "unknown";
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

function buildMetrics(events: SessionEvent[]): SessionMetric {
  const refineCount = events.filter((event) => event.action === "refine").length;
  const qaEvents = events.filter((event) => event.agent === "visual_qa" || event.agent === "playtester");
  const qaFailCount = qaEvents.filter((event) => {
    const impact = (event.change_impact || "").toLowerCase();
    return impact.includes("issue") || impact.includes("failed") || impact.includes("below");
  }).length;
  const modelErrorCount = events.filter((event) => Boolean(event.error_code)).length;
  const runTotal = events.filter((event) => event.event_type.startsWith("prompt_run_")).length;
  const runFailCount = events.filter((event) => event.event_type === "prompt_run_failed").length;
  const engineAuditCount = events.filter((event) => event.event_type === "engine_audit").length;
  const engineDriftCount = events.filter((event) => isEngineDrift(event)).length;

  return {
    refineCount,
    qaFailCount,
    qaTotal: qaEvents.length,
    modelErrorCount,
    eventCount: events.length,
    runTotal,
    runFailCount,
    engineAuditCount,
    engineDriftCount,
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
      const previewMetrics = Object.fromEntries(
        previewRows.map((row) => [row.session_id, buildMetrics((PREVIEW_SESSION_EVENTS[row.session_id] ?? []) as SessionEvent[])]),
      );
      setEventsBySession(previewEventMap);
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
      rows.slice(0, 30).map(async (session) => {
        try {
          const eventPayload = await fetchJson<SessionEventsResponse>(
            `/api/sessions/${encodeURIComponent(session.session_id)}/events?limit=140`,
          );
          const rows = Array.isArray(eventPayload.events) ? eventPayload.events : [];
          return [session.session_id, rows, buildMetrics(rows)] as const;
        } catch {
          return [session.session_id, [], buildMetrics([])] as const;
        }
      }),
    );

    const nextMetrics: Record<string, SessionMetric> = {};
    const nextEventsMap: Record<string, SessionEvent[]> = {};
    metricEntries.forEach(([sessionId, items, metric]) => {
      nextMetrics[sessionId] = metric;
      nextEventsMap[sessionId] = [...items];
    });
    setMetricsBySession(nextMetrics);
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

  const kpi = useMemo(() => {
    const totalSessions = sessions.length;
    const published = sessions.filter((session) => session.status === "published").length;

    const metrics = Object.values(metricsBySession);
    const refineTotal = metrics.reduce((acc, row) => acc + row.refineCount, 0);
    const qaTotal = metrics.reduce((acc, row) => acc + row.qaTotal, 0);
    const qaFail = metrics.reduce((acc, row) => acc + row.qaFailCount, 0);
    const modelErr = metrics.reduce((acc, row) => acc + row.modelErrorCount, 0);
    const eventTotal = metrics.reduce((acc, row) => acc + row.eventCount, 0);
    const runTotal = metrics.reduce((acc, row) => acc + row.runTotal, 0);
    const runFail = metrics.reduce((acc, row) => acc + row.runFailCount, 0);
    const engineAuditTotal = metrics.reduce((acc, row) => acc + row.engineAuditCount, 0);
    const engineDrift = metrics.reduce((acc, row) => acc + row.engineDriftCount, 0);

    return {
      avgRefine: totalSessions ? refineTotal / totalSessions : 0,
      qaFailureRate: qaTotal ? (qaFail / qaTotal) * 100 : 0,
      publishSuccessRate: totalSessions ? (published / totalSessions) * 100 : 0,
      modelErrorRate: eventTotal ? (modelErr / eventTotal) * 100 : 0,
      runFailureRate: runTotal ? (runFail / runTotal) * 100 : 0,
      engineDriftRate: engineAuditTotal ? (engineDrift / engineAuditTotal) * 100 : 0,
    };
  }, [metricsBySession, sessions]);

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
        <h1 className="hero-title observatory-title">🎛 Session Observatory // Retro Ops</h1>
        <p className="muted-text observatory-subtitle">run 보드 · 승인 큐 · 엔진 드리프트 감시</p>
        <div className="observatory-chips">
          <span className="observatory-chip">🧠 Codegen</span>
          <span className="observatory-chip">👁️ Visual QA</span>
          <span className="observatory-chip">🎮 Playtester</span>
          <span className="observatory-chip">🛡 Human Approval Gate</span>
        </div>
      </section>

      {error ? <section className="surface observatory-error">{error}</section> : null}

      <section className="surface observatory-kpi-shell">
        <h2 style={{ margin: 0 }}>KPI</h2>
        <div className="observatory-kpi-grid">
          <div className="card observatory-kpi-card">
            <strong>{kpi.avgRefine.toFixed(2)}</strong>
            <p>세션당 평균 refine 횟수</p>
          </div>
          <div className="card observatory-kpi-card">
            <strong>{kpi.qaFailureRate.toFixed(1)}%</strong>
            <p>QA 실패율</p>
          </div>
          <div className="card observatory-kpi-card">
            <strong>{kpi.publishSuccessRate.toFixed(1)}%</strong>
            <p>Publish 성공률</p>
          </div>
          <div className="card observatory-kpi-card">
            <strong>{kpi.modelErrorRate.toFixed(1)}%</strong>
            <p>모델 오류율</p>
          </div>
          <div className="card observatory-kpi-card">
            <strong>{kpi.runFailureRate.toFixed(1)}%</strong>
            <p>Run 실패율</p>
          </div>
          <div className="card observatory-kpi-card">
            <strong>{kpi.engineDriftRate.toFixed(1)}%</strong>
            <p>엔진 드리프트율</p>
          </div>
        </div>
      </section>

      <section className="surface observatory-shell">
        <div className="observatory-filter-grid">
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
              <option value="run">run</option>
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

        <div className="observatory-main-grid">
          <div className="observatory-session-list">
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
                  {session.status} · score {session.score}
                </p>
                <small>
                  run={session.runStatus}
                  {session.latestError ? ` · err=${session.latestError}` : ""}
                </small>
              </button>
            ))}
            {runBoard.length === 0 ? <p className="observatory-empty">세션이 없습니다.</p> : null}
          </div>

          <div className="observatory-event-list">
            <h3 style={{ margin: 0 }}>Event Timeline {selectedSession ? `· ${selectedSession.title}` : ""}</h3>
            {filteredEvents.map((event) => (
              <article key={event.id} className="card observatory-event-card">
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
            {filteredEvents.length === 0 ? <p className="observatory-empty">표시할 이벤트가 없습니다.</p> : null}
          </div>
        </div>

        <div className="observatory-queue-grid">
          <section className="card observatory-queue-card">
            <h4>🧩 Issue Queue</h4>
            {issueQueue.length === 0 ? (
              <p className="observatory-empty">등록된 이슈 이벤트가 없습니다.</p>
            ) : (
              issueQueue.map((event) => (
                <p key={event.id}>
                  [{event.event_type}] {event.summary}
                </p>
              ))
            )}
          </section>
          <section className="card observatory-queue-card">
            <h4>✅ Publish Approval Queue</h4>
            {approvalQueue.length === 0 ? (
              <p className="observatory-empty">승인/퍼블리시 이벤트가 없습니다.</p>
            ) : (
              approvalQueue.map((event) => (
                <p key={event.id}>
                  [{event.event_type}] {event.summary}
                </p>
              ))
            )}
          </section>
        </div>
      </section>
    </section>
  );
}
