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
    <section className="card">
      <h3>Pipeline Logs</h3>
      <div className="log-filters">
        <label>
          Agent
          <select className="input" value={agentFilter} onChange={(event) => setAgentFilter(event.target.value as AgentName | "all")}>
            {AGENT_OPTIONS.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stage
          <select className="input" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as PipelineStage | "all")}>
            {STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as PipelineStatus | "all")}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="terminal">
        {rendered.length === 0 ? (
          <p>No logs yet.</p>
        ) : (
          rendered.map((log) => (
            <p key={`${log.pipeline_id}-${log.id ?? log.created_at}-${log.stage}`}>
              [{new Date(log.created_at).toLocaleTimeString()}] [{log.stage}/{log.status}] [{log.agent_name}] {log.message}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
