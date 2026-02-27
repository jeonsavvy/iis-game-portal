import type { PipelineLog, PipelineStatus } from "@/types/pipeline";

export function statusTone(status: PipelineStatus | null): "success" | "error" | "running" | "warn" | "idle" | "muted" {
  switch (status) {
    case "success":
      return "success";
    case "error":
      return "error";
    case "running":
      return "running";
    case "retry":
      return "warn";
    case "queued":
      return "idle";
    case "skipped":
      return "muted";
    default:
      return "muted";
  }
}

export function compactMessage(message?: string | null): string {
  if (!message) return "대기중";
  const normalized = message.replace(/\s+/g, " ").trim();
  if (normalized.length <= 86) return normalized;
  return `${normalized.slice(0, 86)}…`;
}

export function qualitySignals(log: PipelineLog | null): { fatal: number; warning: number } {
  if (!log || !log.metadata || typeof log.metadata !== "object") {
    return { fatal: 0, warning: 0 };
  }
  const metadata = log.metadata as Record<string, unknown>;
  const fatal = Array.isArray(metadata.fatal_errors) ? metadata.fatal_errors.filter((entry) => typeof entry === "string").length : 0;
  const warning = Array.isArray(metadata.non_fatal_warnings)
    ? metadata.non_fatal_warnings.filter((entry) => typeof entry === "string").length
    : 0;
  return { fatal, warning };
}

