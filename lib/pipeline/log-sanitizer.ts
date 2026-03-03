import type { PipelineLog, PipelineLogMetadata } from "@/types/pipeline";

const MAX_TEXT_LENGTH = 360;
const MAX_REASON_LENGTH = 240;
const MAX_LIST_ITEMS = 8;

function truncateText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function sanitizeStringList(value: unknown, limit = MAX_LIST_ITEMS): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function sanitizeQualityGateReport(value: unknown): PipelineLogMetadata["quality_gate_report"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;

  const normalizeGate = (gate: unknown) => {
    if (!gate || typeof gate !== "object") return undefined;
    const typed = gate as Record<string, unknown>;
    const ok = toBoolean(typed.ok);
    const score = toNumber(typed.score);
    const threshold = toNumber(typed.threshold);
    const failedChecks = sanitizeStringList(typed.failed_checks);
    if (ok === null && score === null && threshold === null && failedChecks.length === 0) {
      return undefined;
    }
    return {
      ...(ok !== null ? { ok } : {}),
      ...(score !== null ? { score } : {}),
      ...(threshold !== null ? { threshold } : {}),
      ...(failedChecks.length > 0 ? { failed_checks: failedChecks } : {}),
    };
  };

  const normalizePlayability = (gate: unknown) => {
    if (!gate || typeof gate !== "object") return undefined;
    const typed = gate as Record<string, unknown>;
    const ok = toBoolean(typed.ok);
    const score = toNumber(typed.score);
    const failReasons = sanitizeStringList(typed.fail_reasons);
    if (ok === null && score === null && failReasons.length === 0) {
      return undefined;
    }
    return {
      ...(ok !== null ? { ok } : {}),
      ...(score !== null ? { score } : {}),
      ...(failReasons.length > 0 ? { fail_reasons: failReasons } : {}),
    };
  };

  const normalizeSmoke = (gate: unknown) => {
    if (!gate || typeof gate !== "object") return undefined;
    const typed = gate as Record<string, unknown>;
    const ok = toBoolean(typed.ok);
    const reason = truncateText(typed.reason, MAX_REASON_LENGTH);
    const fatalErrors = sanitizeStringList(typed.fatal_errors, 4);
    const nonFatalWarnings = sanitizeStringList(typed.non_fatal_warnings, 4);
    if (ok === null && !reason && fatalErrors.length === 0 && nonFatalWarnings.length === 0) {
      return undefined;
    }
    return {
      ...(ok !== null ? { ok } : {}),
      ...(reason ? { reason } : {}),
      ...(fatalErrors.length > 0 ? { fatal_errors: fatalErrors } : {}),
      ...(nonFatalWarnings.length > 0 ? { non_fatal_warnings: nonFatalWarnings } : {}),
    };
  };

  const quality = normalizeGate(raw.quality);
  const gameplay = normalizeGate(raw.gameplay);
  const visual = normalizeGate(raw.visual);
  const playability = normalizePlayability(raw.playability);
  const smoke = normalizeSmoke(raw.smoke);

  if (!quality && !gameplay && !visual && !playability && !smoke) {
    return undefined;
  }
  return {
    ...(quality ? { quality } : {}),
    ...(gameplay ? { gameplay } : {}),
    ...(visual ? { visual } : {}),
    ...(playability ? { playability } : {}),
    ...(smoke ? { smoke } : {}),
  };
}

function sanitizeIntentContract(value: unknown): PipelineLogMetadata["intent_contract"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const fantasy = truncateText(raw.fantasy, MAX_TEXT_LENGTH);
  const playerVerbs = sanitizeStringList(raw.player_verbs, 10);
  const cameraInteraction = truncateText(raw.camera_interaction, MAX_TEXT_LENGTH);
  const progressionLoop = sanitizeStringList(raw.progression_loop, 8);
  const failRestartLoop = truncateText(raw.fail_restart_loop, MAX_TEXT_LENGTH);
  const nonNegotiables = sanitizeStringList(raw.non_negotiables, 8);
  if (!fantasy && playerVerbs.length === 0 && !cameraInteraction && progressionLoop.length === 0 && !failRestartLoop && nonNegotiables.length === 0) {
    return undefined;
  }
  return {
    ...(fantasy ? { fantasy } : {}),
    ...(playerVerbs.length > 0 ? { player_verbs: playerVerbs } : {}),
    ...(cameraInteraction ? { camera_interaction: cameraInteraction } : {}),
    ...(progressionLoop.length > 0 ? { progression_loop: progressionLoop } : {}),
    ...(failRestartLoop ? { fail_restart_loop: failRestartLoop } : {}),
    ...(nonNegotiables.length > 0 ? { non_negotiables: nonNegotiables } : {}),
  };
}

function sanitizeIntentGateReport(value: unknown): PipelineLogMetadata["intent_gate_report"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const ok = toBoolean(raw.ok);
  const score = toNumber(raw.score);
  const threshold = toNumber(raw.threshold);
  const failedItems = sanitizeStringList(raw.failed_items, 10);
  const checksRaw = raw.checks;
  const checks =
    checksRaw && typeof checksRaw === "object"
      ? Object.fromEntries(
          Object.entries(checksRaw as Record<string, unknown>)
            .map(([key, item]) => [key, toBoolean(item)])
            .filter(([, item]) => item !== null) as Array<[string, boolean]>,
        )
      : undefined;
  const reasonsRaw = raw.reason_by_item;
  const reasonByItem =
    reasonsRaw && typeof reasonsRaw === "object"
      ? Object.fromEntries(
          Object.entries(reasonsRaw as Record<string, unknown>)
            .map(([key, item]) => [key, sanitizeStringList(item, 5)])
            .filter(([, item]) => item.length > 0),
        )
      : undefined;
  if (ok === null && score === null && threshold === null && failedItems.length === 0 && !checks && !reasonByItem) {
    return undefined;
  }
  return {
    ...(ok !== null ? { ok } : {}),
    ...(score !== null ? { score } : {}),
    ...(threshold !== null ? { threshold } : {}),
    ...(failedItems.length > 0 ? { failed_items: failedItems } : {}),
    ...(checks && Object.keys(checks).length > 0 ? { checks } : {}),
    ...(reasonByItem && Object.keys(reasonByItem).length > 0 ? { reason_by_item: reasonByItem } : {}),
  };
}

export function sanitizePipelineLogMetadata(raw: unknown): PipelineLogMetadata {
  if (!raw || typeof raw !== "object") return {};
  const metadata = raw as Record<string, unknown>;
  const sanitized: PipelineLogMetadata = {};

  const stringKeys = [
    "generation_engine_version",
    "substrate_id",
    "camera_model",
    "module_signature",
    "rebuild_source",
    "rqc_version",
    "archive_status",
    "public_url",
    "event_type",
    "intent_contract_hash",
  ] as const;
  for (const key of stringKeys) {
    const value = truncateText(metadata[key], MAX_TEXT_LENGTH);
    if (value) {
      sanitized[key] = value;
    }
  }

  const numberKeys = [
    "quality_floor_score",
    "final_quality_score",
    "final_gameplay_score",
    "final_visual_score",
    "final_builder_quality_score",
    "playability_score",
    "final_composite_score",
    "codegen_generation_attempts",
  ] as const;
  for (const key of numberKeys) {
    const value = toNumber(metadata[key]);
    if (value !== null) {
      sanitized[key] = value;
    }
  }

  const booleanKeys = [
    "quality_floor_passed",
    "quality_floor_enforced",
    "final_smoke_ok",
    "rqc_passed",
    "strict_vertex_only",
    "fallback_blocked",
  ] as const;
  for (const key of booleanKeys) {
    const value = toBoolean(metadata[key]);
    if (value !== null) {
      sanitized[key] = value;
    }
  }

  const listKeys = [
    "blocking_reasons",
    "quality_floor_fail_reasons",
    "playability_fail_reasons",
    "fatal_errors",
    "non_fatal_warnings",
  ] as const;
  for (const key of listKeys) {
    const list = sanitizeStringList(metadata[key]);
    if (list.length > 0) {
      sanitized[key] = list;
    }
  }

  const selfcheckRaw = metadata.selfcheck_result;
  if (selfcheckRaw && typeof selfcheckRaw === "object") {
    const selfcheck = selfcheckRaw as Record<string, unknown>;
    const passed = toBoolean(selfcheck.passed);
    const score = toNumber(selfcheck.score);
    const failedReasons = sanitizeStringList(selfcheck.failed_reasons, 5);
    if (passed !== null || score !== null || failedReasons.length > 0) {
      sanitized.selfcheck_result = {
        ...(passed !== null ? { passed } : {}),
        ...(score !== null ? { score } : {}),
        ...(failedReasons.length > 0 ? { failed_reasons: failedReasons } : {}),
      };
    }
  }

  const qualityGateReport = sanitizeQualityGateReport(metadata.quality_gate_report);
  if (qualityGateReport) {
    sanitized.quality_gate_report = qualityGateReport;
  }
  const intentContract = sanitizeIntentContract(metadata.intent_contract);
  if (intentContract) {
    sanitized.intent_contract = intentContract;
  }
  const intentGateReport = sanitizeIntentGateReport(metadata.intent_gate_report);
  if (intentGateReport) {
    sanitized.intent_gate_report = intentGateReport;
  }

  const usageRaw = metadata.usage;
  if (usageRaw && typeof usageRaw === "object") {
    const usage = usageRaw as Record<string, unknown>;
    const promptTokens = toNumber(usage.prompt_tokens);
    const completionTokens = toNumber(usage.completion_tokens);
    const totalTokens = toNumber(usage.total_tokens);
    const estimatedCostUsd = toNumber(usage.estimated_cost_usd);
    if (promptTokens !== null || completionTokens !== null || totalTokens !== null || estimatedCostUsd !== null) {
      sanitized.usage = {
        ...(promptTokens !== null ? { prompt_tokens: promptTokens } : {}),
        ...(completionTokens !== null ? { completion_tokens: completionTokens } : {}),
        ...(totalTokens !== null ? { total_tokens: totalTokens } : {}),
        ...(estimatedCostUsd !== null ? { estimated_cost_usd: estimatedCostUsd } : {}),
      };
    }
  }

  const model = truncateText(metadata.model, 80);
  if (model) {
    sanitized.model = model;
  }

  return sanitized;
}

export function sanitizePipelineLog(log: PipelineLog): PipelineLog {
  return {
    ...log,
    message: truncateText(log.message, MAX_TEXT_LENGTH) ?? "로그 없음",
    reason: truncateText(log.reason, MAX_REASON_LENGTH),
    metadata: sanitizePipelineLogMetadata(log.metadata),
  };
}
