"use client";

import { useEffect, useMemo, useState } from "react";

import { subscribePipelineLogs } from "@/lib/supabase/realtime";
import type { AgentName, PipelineLog, PipelineStage, PipelineStatus } from "@/types/pipeline";

const AGENT_OPTIONS: Array<AgentName | "all"> = [
  "all",
  "Trigger",
  "Architect",
  "Stylist",
  "Builder",
  "Sentinel",
  "Publisher",
  "Echo",
];

const STAGE_OPTIONS: Array<PipelineStage | "all"> = [
  "all",
  "trigger",
  "plan",
  "style",
  "build",
  "qa",
  "publish",
  "echo",
  "done",
];

const STATUS_OPTIONS: Array<PipelineStatus | "all"> = ["all", "queued", "running", "success", "error", "retry", "skipped"];

const AGENT_LABELS: Record<AgentName | "all", string> = {
  all: "전체",
  Trigger: "트리거",
  Architect: "아키텍트",
  Stylist: "스타일리스트",
  Builder: "빌더",
  Sentinel: "센티넬",
  Publisher: "퍼블리셔",
  Echo: "에코",
};

const STAGE_LABELS: Record<PipelineStage | "all", string> = {
  all: "전체",
  trigger: "trigger (트리거)",
  plan: "plan (기획)",
  style: "style (스타일)",
  build: "build (빌드)",
  qa: "qa (검수)",
  publish: "publish (게시)",
  echo: "echo (홍보)",
  done: "done (완료)",
};

const STATUS_LABELS: Record<PipelineStatus | "all", string> = {
  all: "전체",
  queued: "대기",
  running: "실행중",
  success: "성공",
  error: "실패",
  retry: "재시도",
  skipped: "건너뜀",
};

export function PipelineTerminal({
  initialLogs,
  pipelineId,
}: {
  initialLogs: PipelineLog[];
  pipelineId?: string;
}) {
  const [logs, setLogs] = useState<PipelineLog[]>(initialLogs);
  const [agentFilter, setAgentFilter] = useState<AgentName | "all">("all");
  const [stageFilter, setStageFilter] = useState<PipelineStage | "all">("all");
  const [statusFilter, setStatusFilter] = useState<PipelineStatus | "all">("all");

  useEffect(() => {
    const channel = subscribePipelineLogs((newLog) => {
      setLogs((prev) => [newLog, ...prev].slice(0, 300));
    }, pipelineId);

    return () => {
      channel.unsubscribe();
    };
  }, [pipelineId]);

  const rendered = useMemo(() => {
    const filtered = logs.filter((log) => {
      if (agentFilter !== "all" && log.agent_name !== agentFilter) {
        return false;
      }
      if (stageFilter !== "all" && log.stage !== stageFilter) {
        return false;
      }
      if (statusFilter !== "all" && log.status !== statusFilter) {
        return false;
      }
      return true;
    });

    return filtered.slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [logs, agentFilter, stageFilter, statusFilter]);

  return (
    <section className="surface terminal-shell">
      <div className="section-head compact">
        <div>
          <p className="eyebrow">실시간 관측</p>
          <h3 className="section-title">파이프라인 로그</h3>
        </div>
        <p className="section-subtitle">Supabase Realtime 구독으로 새 로그를 즉시 반영합니다.</p>
      </div>

      <div className="log-filters">
        <label className="field">
          <span>에이전트</span>
          <select className="input" value={agentFilter} onChange={(event) => setAgentFilter(event.target.value as AgentName | "all")}>
            {AGENT_OPTIONS.map((agent) => (
              <option key={agent} value={agent}>
                {AGENT_LABELS[agent]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>단계</span>
          <select className="input" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as PipelineStage | "all")}>
            {STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>상태</span>
          <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as PipelineStatus | "all")}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="terminal-head">
        <span className="status-chip tone-running">LIVE</span>
        <span className="muted-text">표시 로그 수: {rendered.length}</span>
      </div>
      <div className="terminal">
        {rendered.length === 0 ? (
          <p>아직 로그가 없습니다.</p>
        ) : (
          rendered.map((log) => (
            <div className="terminal-line" key={`${log.pipeline_id}-${log.id ?? log.created_at}-${log.stage}`}>
              <span className="terminal-time">{new Date(log.created_at).toLocaleTimeString()}</span>
              <span className={`status-chip tone-${log.status === "success" ? "success" : log.status === "error" ? "error" : log.status === "running" ? "running" : log.status === "retry" ? "warn" : "idle"}`}>
                {STATUS_LABELS[log.status]}
              </span>
              <span className="terminal-tag">{log.agent_name}</span>
              <span className="terminal-tag subtle">{log.stage}</span>
              <span className="terminal-message">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
