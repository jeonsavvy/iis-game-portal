import type {
  AgentLane,
  AgentThreadEvent,
  FailureReasonGroup,
  HandoffEvent,
  PipelineDiagnosticsResponse,
  PipelineLog,
  PipelineStage,
  PipelineStatus,
} from "@/types/pipeline";

const STAGE_TO_LANE: Record<PipelineStage | "done", AgentLane> = {
  analyze: "A",
  plan: "A",
  design: "A",
  build: "A",
  qa_runtime: "B",
  qa_quality: "B",
  release: "B",
  report: "B",
  done: "SYSTEM",
};

const STAGE_VALUES: ReadonlySet<string> = new Set<PipelineStage | "done">([
  "analyze",
  "plan",
  "design",
  "build",
  "qa_runtime",
  "qa_quality",
  "release",
  "report",
  "done",
]);

function normalizeReason(reason: unknown): string | null {
  if (typeof reason !== "string") return null;
  const compact = reason.replace(/\s+/g, " ").trim();
  return compact.length > 0 ? compact : null;
}

function dedupeReasons(reasons: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const reason of reasons) {
    const key = reason.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(reason);
  }
  return deduped;
}

function stageToLane(stage: PipelineStage | "done", explicit?: unknown): AgentLane {
  if (explicit === "A" || explicit === "B" || explicit === "SYSTEM") return explicit;
  return STAGE_TO_LANE[stage] ?? "SYSTEM";
}

function arrayReasons(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeReason(item))
    .filter((item): item is string => Boolean(item));
}

function collectLogReasons(log: PipelineLog): string[] {
  const metadata = log.metadata && typeof log.metadata === "object" ? (log.metadata as Record<string, unknown>) : {};
  const reasons = [
    normalizeReason(log.reason),
    ...arrayReasons(metadata.blocking_reasons),
    ...arrayReasons(metadata.quality_floor_fail_reasons),
    ...arrayReasons(metadata.blocking_reasons_normalized),
  ].filter((item): item is string => Boolean(item));

  const intentGate = metadata.intent_gate_report;
  if (intentGate && typeof intentGate === "object") {
    reasons.push(...arrayReasons((intentGate as Record<string, unknown>).failed_items));
  }
  return dedupeReasons(reasons);
}

function classifyReasonCategory(reason: string): FailureReasonGroup["category"] {
  const token = reason.toLowerCase();
  if (
    token.includes("visual") ||
    token.includes("contrast") ||
    token.includes("color_") ||
    token.includes("edge_") ||
    token.includes("motion") ||
    token.includes("shader")
  ) {
    return "visual";
  }
  if (
    token.includes("gameplay") ||
    token.includes("flight_") ||
    token.includes("core_loop") ||
    token.includes("restart_loop") ||
    token.includes("progression")
  ) {
    return "gameplay";
  }
  if (
    token.includes("runtime") ||
    token.includes("smoke") ||
    token.includes("console_error") ||
    token.includes("vertex") ||
    token.includes("codegen") ||
    token.includes("resource_exhausted")
  ) {
    return "runtime";
  }
  if (
    token.includes("intent") ||
    token.includes("fantasy") ||
    token.includes("player_verbs") ||
    token.includes("non_negotiables")
  ) {
    return "intent";
  }
  if (
    token.includes("builder_quality_floor_unmet") ||
    token.includes("gdd_unavailable") ||
    token.includes("design_spec_unavailable") ||
    token.includes("plan_contract_invalid")
  ) {
    return "system";
  }
  return "other";
}

function buildFailureReasonGroups(reasons: string[]): FailureReasonGroup[] {
  const grouped = new Map<FailureReasonGroup["category"], string[]>();
  for (const reason of reasons) {
    const category = classifyReasonCategory(reason);
    const bucket = grouped.get(category) ?? [];
    bucket.push(reason);
    grouped.set(category, bucket);
  }
  return Array.from(grouped.entries()).map(([category, rows]) => ({
    category,
    reasons: dedupeReasons(rows),
  }));
}

function buildQualitySnapshot(logs: PipelineLog[]): PipelineDiagnosticsResponse["quality_snapshot"] {
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const metadata = logs[index].metadata;
    const qualityGate = metadata?.quality_gate_report;
    if (qualityGate && typeof qualityGate === "object") {
      const typed = qualityGate as PipelineDiagnosticsResponse["quality_snapshot"];
      return {
        quality: typed?.quality,
        gameplay: typed?.gameplay,
        visual: typed?.visual,
        playability: typed?.playability,
        smoke: typed?.smoke,
      };
    }
  }
  return null;
}

function buildIntentSnapshot(logs: PipelineLog[]): PipelineDiagnosticsResponse["intent_snapshot"] {
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const metadata = logs[index].metadata;
    const intentGate = metadata?.intent_gate_report;
    if (intentGate && typeof intentGate === "object") {
      return intentGate;
    }
  }
  return null;
}

function buildAgentThread(logs: PipelineLog[]): AgentThreadEvent[] {
  return logs.map((log) => {
    const lane = stageToLane(log.stage, log.metadata?.agent_lane);
    const tags = collectLogReasons(log).slice(0, 4);
    return {
      id: `${log.pipeline_id}-${log.id ?? log.created_at}-${log.stage}`,
      lane,
      stage: log.stage,
      status: log.status,
      agent_name: log.agent_name,
      message: log.message,
      reason: log.reason,
      created_at: log.created_at,
      ...(tags.length > 0 ? { tags } : {}),
    };
  });
}

function buildHandoffEvents(logs: PipelineLog[]): HandoffEvent[] {
  const thread = buildAgentThread(logs);
  const events: HandoffEvent[] = [];

  for (let index = 1; index < thread.length; index += 1) {
    const previous = thread[index - 1];
    const current = thread[index];
    if (previous.lane === current.lane) continue;
    events.push({
      id: `${current.id}-lane-shift`,
      from_lane: previous.lane,
      to_lane: current.lane,
      stage: current.stage,
      created_at: current.created_at,
      summary: `${previous.stage} → ${current.stage}`,
      reason: current.reason,
    });
  }

  for (const log of logs) {
    const targetStage = normalizeReason(log.metadata?.handoff_to_stage);
    if (!targetStage || !STAGE_VALUES.has(targetStage)) continue;
    const toStage = targetStage as PipelineStage | "done";
    const fromLane = stageToLane(log.stage, log.metadata?.agent_lane);
    const toLane = stageToLane(toStage);
    events.push({
      id: `${log.pipeline_id}-${log.id ?? log.created_at}-handoff`,
      from_lane: fromLane,
      to_lane: toLane,
      stage: log.stage,
      created_at: log.created_at,
      summary: normalizeReason(log.metadata?.handoff_summary) ?? `${log.stage} handoff to ${toStage}`,
      reason: log.reason,
    });
  }

  const uniq = new Map<string, HandoffEvent>();
  for (const event of events) {
    uniq.set(event.id, event);
  }
  return Array.from(uniq.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function buildStageFailureMap(logs: PipelineLog[]): PipelineDiagnosticsResponse["stage_failure_map"] {
  const stageMap: Partial<Record<PipelineStage | "done", string[]>> = {};
  for (const log of logs) {
    if (log.status !== "error" && log.status !== "retry") continue;
    const reasons = collectLogReasons(log);
    if (reasons.length === 0) continue;
    const current = stageMap[log.stage] ?? [];
    stageMap[log.stage] = dedupeReasons([...current, ...reasons]);
  }
  return stageMap;
}

function buildPrimaryReason(
  errorReason: string | null,
  logs: PipelineLog[],
  allReasons: string[],
): string | null {
  const explicit = normalizeReason(errorReason);
  if (explicit) return explicit;

  const latestError = [...logs].reverse().find((log) => log.status === "error" || log.status === "retry");
  if (latestError) {
    const reasons = collectLogReasons(latestError);
    if (reasons.length > 0) return reasons[0];
  }

  return allReasons[0] ?? null;
}

export function buildPipelineDiagnostics(args: {
  resolvedPipelineId: string;
  status: PipelineStatus;
  errorReason: string | null;
  logs: PipelineLog[];
}): PipelineDiagnosticsResponse {
  const sortedLogs = [...args.logs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const allReasons = dedupeReasons(sortedLogs.flatMap((log) => collectLogReasons(log)));
  const primaryFailureReason = buildPrimaryReason(args.errorReason, sortedLogs, allReasons);
  const secondaryReasons = allReasons.filter((reason) => reason !== primaryFailureReason).slice(0, 12);
  const reasonGroups = buildFailureReasonGroups(primaryFailureReason ? [primaryFailureReason, ...secondaryReasons] : secondaryReasons);

  return {
    resolved_pipeline_id: args.resolvedPipelineId,
    status: args.status,
    error_reason: args.errorReason,
    primary_failure_reason: primaryFailureReason,
    secondary_reasons: secondaryReasons,
    failure_reason_groups: reasonGroups,
    stage_failure_map: buildStageFailureMap(sortedLogs),
    quality_snapshot: buildQualitySnapshot(sortedLogs),
    intent_snapshot: buildIntentSnapshot(sortedLogs),
    agent_thread: buildAgentThread(sortedLogs),
    handoff_events: buildHandoffEvents(sortedLogs),
  };
}
