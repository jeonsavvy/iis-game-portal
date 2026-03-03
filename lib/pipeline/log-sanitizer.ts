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
  ] as const;
  for (const key of numberKeys) {
    const value = toNumber(metadata[key]);
    if (value !== null) {
      sanitized[key] = value;
    }
  }

  const booleanKeys = ["quality_floor_passed", "quality_floor_enforced", "final_smoke_ok", "rqc_passed"] as const;
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

  const usageRaw = metadata.usage;
  if (usageRaw && typeof usageRaw === "object") {
    const usage = usageRaw as Record<string, unknown>;
    const promptTokens = toNumber(usage.prompt_tokens);
    const completionTokens = toNumber(usage.completion_tokens);
    const totalTokens = toNumber(usage.total_tokens);
    if (promptTokens !== null || completionTokens !== null || totalTokens !== null) {
      sanitized.usage = {
        ...(promptTokens !== null ? { prompt_tokens: promptTokens } : {}),
        ...(completionTokens !== null ? { completion_tokens: completionTokens } : {}),
        ...(totalTokens !== null ? { total_tokens: totalTokens } : {}),
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

