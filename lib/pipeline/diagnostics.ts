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

const CATEGORY_PREFIXES = ["visual", "runtime", "intent", "gameplay", "quality", "codegen", "other"] as const;

const HUMAN_REASON_MAP: Record<string, string> = {
  builder_quality_floor_unmet: "품질 하한선 미충족",
  generation_checklist_unmet: "생성 체크리스트 미충족",
  quality_gate_unmet: "품질 게이트 미통과",
  gameplay_gate_unmet: "게임플레이 게이트 미통과",
  visual_gate_unmet: "시각 게이트 미통과",
  intent_gate_unmet: "의도 게이트 미통과",
  runtime_smoke_failed: "런타임 스모크 실패",
  visual_contrast: "시각 대비 부족",
  color_diversity: "색상 다양성 부족",
  edge_definition: "윤곽/엣지 표현 부족",
  motion_presence: "움직임 표현 부족",
  composition_balance: "화면 구성 균형 부족",
  restart_loop: "재시작 루프 부족",
  core_loop_tick: "코어 루프 진행 부족",
  input_reactivity_missing: "입력 반응 부족",
  builder_playability_unmet: "플레이 가능성 미충족",
  "checklist:visual_contrast": "시각 대비 체크 미통과",
  "checklist:color_diversity": "색상 다양성 체크 미통과",
  "checklist:visual_diversity": "시각 다양성 체크 미통과",
  "checklist:visual_color_diversity": "시각 다양성 체크 미통과",
  "checklist:composition_balance": "구성 균형 체크 미통과",
  "checklist:visual_edge": "엣지 표현 체크 미통과",
  "checklist:edge_definition": "윤곽 표현 체크 미통과",
  "checklist:visual_motion": "움직임 체크 미통과",
  "checklist:motion_presence": "움직임 존재 체크 미통과",
  "checklist:input_reaction": "입력 반응 체크 미통과",
  "checklist:input_reactivity": "입력 반응 체크 미통과",
  "checklist:state_transition": "상태 전이 체크 미통과",
  "checklist:restart_loop": "재시작 루프 체크 미통과",
};

function normalizeReason(reason: unknown): string | null {
  if (typeof reason !== "string") return null;
  const compact = reason.replace(/\s+/g, " ").trim();
  return compact.length > 0 ? compact : null;
}

function stripCategoryPrefixes(token: string): string {
  let current = token.trim();
  while (true) {
    const separator = current.indexOf(":");
    if (separator <= 0) break;
    const head = current.slice(0, separator).toLowerCase();
    if (!(CATEGORY_PREFIXES as readonly string[]).includes(head)) break;
    current = current.slice(separator + 1);
  }
  return current;
}

function canonicalReason(reason: string): string {
  const compact = reason.replace(/\s+/g, " ").trim().toLowerCase();
  if (!compact) return compact;
  return stripCategoryPrefixes(compact);
}

function dedupeReasons(reasons: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const reason of reasons) {
    const canonical = canonicalReason(reason);
    if (!canonical) continue;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    deduped.push(canonical);
  }
  return deduped;
}

function stageToLane(stage: PipelineStage | "done", explicit?: unknown): AgentLane {
  if (explicit === "A" || explicit === "B" || explicit === "SYSTEM") return explicit;
  return STAGE_TO_LANE[stage] ?? "SYSTEM";
}

function arrayReasons(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeReason(item)).filter((item): item is string => Boolean(item));
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

function classifyChecklistToken(reason: string): FailureReasonGroup["category"] {
  const checklistToken = reason.slice("checklist:".length);
  if (
    checklistToken.startsWith("visual_") ||
    checklistToken.startsWith("color_") ||
    checklistToken.includes("contrast") ||
    checklistToken.includes("diversity") ||
    checklistToken.includes("edge") ||
    checklistToken.includes("motion") ||
    checklistToken.includes("composition")
  ) {
    return "visual";
  }
  if (
    checklistToken.startsWith("input_") ||
    checklistToken.startsWith("state_") ||
    checklistToken.startsWith("restart_") ||
    checklistToken.startsWith("runtime_")
  ) {
    return "runtime";
  }
  if (
    checklistToken.startsWith("gameplay_") ||
    checklistToken.startsWith("core_loop") ||
    checklistToken.startsWith("progression")
  ) {
    return "gameplay";
  }
  return "quality";
}

function classifyReasonCategory(reason: string): FailureReasonGroup["category"] {
  const token = canonicalReason(reason);
  if (!token) return "other";
  if (token.startsWith("checklist:")) {
    return classifyChecklistToken(token);
  }
  if (token.startsWith("intent:") || token.startsWith("intent_") || token === "intent_gate_unmet") {
    return "intent";
  }
  if (token.startsWith("codegen_") || token.startsWith("codegen:") || token.startsWith("codegen_reason:") || token.startsWith("codegen_error:")) {
    return "codegen";
  }
  if (
    token.startsWith("runtime_") ||
    token === "runtime_smoke_failed" ||
    token === "builder_playability_unmet" ||
    token === "input_reactivity_missing" ||
    token === "missing_realtime_loop" ||
    token === "restart_loop" ||
    token === "core_loop_tick"
  ) {
    return "runtime";
  }
  if (
    token.startsWith("visual_") ||
    token === "visual_gate_unmet" ||
    token === "visual_contrast" ||
    token === "color_diversity" ||
    token === "edge_definition" ||
    token === "motion_presence" ||
    token === "composition_balance" ||
    token === "visual_cohesion"
  ) {
    return "visual";
  }
  if (token.startsWith("gameplay_") || token === "gameplay_gate_unmet") {
    return "gameplay";
  }
  if (token.startsWith("quality_") || token === "quality_gate_unmet" || token === "generation_checklist_unmet") {
    return "quality";
  }
  if (
    token === "builder_quality_floor_unmet" ||
    token === "gdd_unavailable" ||
    token === "design_spec_unavailable" ||
    token === "plan_contract_invalid"
  ) {
    return "system";
  }
  return "other";
}

function prettifyFallback(token: string): string {
  return token.replace(/^checklist:/, "checklist ").replace(/[_:]+/g, " ").trim();
}

function humanizeReason(reason: string): string {
  const token = canonicalReason(reason);
  if (!token) return reason;
  const mapped = HUMAN_REASON_MAP[token];
  if (mapped) return mapped;
  if (token.startsWith("intent:")) {
    return `의도 항목 미충족 (${token.slice("intent:".length)})`;
  }
  return prettifyFallback(token);
}

function buildFailureReasonGroups(reasons: string[]): FailureReasonGroup[] {
  const grouped = new Map<FailureReasonGroup["category"], string[]>();
  for (const reason of reasons) {
    const category = classifyReasonCategory(reason);
    const bucket = grouped.get(category) ?? [];
    bucket.push(canonicalReason(reason));
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
    const reasons = collectLogReasons(log).slice(0, 4);
    const reasonLabel = reasons.length > 0 ? humanizeReason(reasons[0]) : null;
    return {
      id: `${log.pipeline_id}-${log.id ?? log.created_at}-${log.stage}`,
      lane,
      stage: log.stage,
      status: log.status,
      agent_name: log.agent_name,
      message: log.message,
      reason: log.reason,
      created_at: log.created_at,
      ...(reasons.length > 0 ? { tags: reasons } : {}),
      ...(reasonLabel ? { display_text: reasonLabel } : {}),
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
      summary: normalizeReason(log.metadata?.handoff_summary) ?? `${log.stage} → ${toStage}`,
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

function pickCategoryPriorityReason(reasons: string[]): string | null {
  const priority: FailureReasonGroup["category"][] = ["visual", "gameplay", "runtime", "intent", "quality", "system", "codegen", "other"];
  const groups = buildFailureReasonGroups(reasons);
  for (const category of priority) {
    const group = groups.find((item) => item.category === category);
    if (group && group.reasons.length > 0) {
      return group.reasons[0];
    }
  }
  return reasons[0] ?? null;
}

function buildPrimaryReason(errorReason: string | null, logs: PipelineLog[], allReasons: string[]): string | null {
  const explicit = normalizeReason(errorReason);
  if (explicit) {
    return canonicalReason(explicit);
  }

  const latestError = [...logs].reverse().find((log) => log.status === "error" || log.status === "retry");
  if (latestError) {
    const reasons = collectLogReasons(latestError);
    if (reasons.length > 0) return reasons[0];
  }

  return pickCategoryPriorityReason(allReasons);
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
    error_reason: args.errorReason ? canonicalReason(args.errorReason) : null,
    primary_failure_reason: primaryFailureReason,
    primary_failure_reason_human: primaryFailureReason ? humanizeReason(primaryFailureReason) : null,
    secondary_reasons: secondaryReasons,
    secondary_reasons_human: secondaryReasons.map((reason) => humanizeReason(reason)),
    failure_reason_groups: reasonGroups,
    failure_reason_groups_human: reasonGroups.map((group) => ({
      category: group.category,
      reasons: group.reasons.map((reason) => humanizeReason(reason)),
    })),
    stage_failure_map: buildStageFailureMap(sortedLogs),
    quality_snapshot: buildQualitySnapshot(sortedLogs),
    intent_snapshot: buildIntentSnapshot(sortedLogs),
    agent_thread: buildAgentThread(sortedLogs),
    handoff_events: buildHandoffEvents(sortedLogs),
  };
}
