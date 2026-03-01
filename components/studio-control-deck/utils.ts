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

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function stageEvidence(log: PipelineLog | null): string[] {
  if (!log || !log.metadata || typeof log.metadata !== "object") return [];
  const metadata = log.metadata as Record<string, unknown>;
  const rows: string[] = [];

  if (log.stage === "build") {
    const engine = metadata.genre_engine_selected;
    if (typeof engine === "string" && engine.trim()) rows.push(`엔진 ${engine}`);

    const assetPack = metadata.asset_pack;
    if (typeof assetPack === "string" && assetPack.trim()) rows.push(`에셋팩 ${assetPack}`);

    const variant = metadata.asset_pipeline_selected_variant;
    if (typeof variant === "string" && variant.trim()) rows.push(`변형 ${variant}`);

    const finalScore = numberValue(metadata.final_composite_score);
    if (finalScore !== null) rows.push(`완성도 ${finalScore.toFixed(1)}`);

    const memoryHintApplied = metadata.memory_hint_applied;
    if (memoryHintApplied === true) rows.push("누적 메모리 반영");
  }

  if (log.stage === "qa") {
    if (typeof log.reason === "string" && log.reason.trim()) rows.push(`사유 ${log.reason}`);

    const quality = numberValue(metadata.quality_score);
    if (quality !== null) rows.push(`품질 ${quality.toFixed(1)}`);

    const gameplay = numberValue(metadata.gameplay_score);
    if (gameplay !== null) rows.push(`게임성 ${gameplay.toFixed(1)}`);

    const visual = numberValue(metadata.visual_score);
    if (visual !== null) rows.push(`시각 ${visual.toFixed(1)}`);
  }

  if (log.stage === "publish") {
    const archiveStatus = metadata.archive_status;
    if (typeof archiveStatus === "string" && archiveStatus.trim()) rows.push(`아카이브 ${archiveStatus}`);

    const publicUrl = metadata.public_url;
    if (typeof publicUrl === "string" && publicUrl.trim()) rows.push("공개 URL 갱신");
  }

  if (log.stage === "echo") {
    const score = numberValue(metadata.final_quality_score);
    if (score !== null) rows.push(`최종 품질 ${score.toFixed(1)}`);
    const gameplay = numberValue(metadata.final_gameplay_score);
    if (gameplay !== null) rows.push(`최종 게임성 ${gameplay.toFixed(1)}`);
  }

  if (rows.length === 0 && typeof log.reason === "string" && log.reason.trim()) {
    rows.push(`사유 ${log.reason}`);
  }

  return rows.slice(0, 4);
}
