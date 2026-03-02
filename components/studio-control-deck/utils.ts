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
  const lowered = normalized.toLowerCase();
  if (lowered.includes("candidate") && lowered.includes("evaluated")) return "후보 검토";
  if (lowered.includes("generation started")) return "생성 시작";
  if (lowered.includes("artifact selected")) return "후보 확정";
  if (lowered.includes("final polish pass")) return "최종 다듬기";
  if (lowered.includes("runtime qa smoke check started")) return "실행 점검 시작";
  if (lowered.includes("runtime qa passed")) return "실행 점검 완료";
  if (lowered.includes("quality qa")) return "품질 점검";
  if (lowered.includes("published") || lowered.includes("archive sync")) return "배포 반영";
  if (lowered.includes("pipeline finished")) return "파이프라인 완료";
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
    const substrate = typeof metadata.substrate_id === "string" ? metadata.substrate_id.trim() : "";
    if (substrate) rows.push(`서브스트레이트 ${substrate}`);
    const finalScore = numberValue(metadata.playability_score) ?? numberValue(metadata.final_composite_score);
    if (finalScore !== null) rows.push(`점수 ${finalScore.toFixed(1)}`);
  }

  if (log.stage === "qa_runtime" || log.stage === "qa_quality") {
    if (typeof log.reason === "string" && log.reason.trim()) rows.push(`사유 ${log.reason}`);

    const quality = numberValue(metadata.playability_score) ?? numberValue(metadata.quality_score);
    if (quality !== null) rows.push(`품질 ${quality.toFixed(1)}`);
  }

  if (log.stage === "release") {
    const archiveStatus = metadata.archive_status;
    if (typeof archiveStatus === "string" && archiveStatus.trim()) rows.push(`아카이브 ${archiveStatus}`);

    const publicUrl = metadata.public_url;
    if (typeof publicUrl === "string" && publicUrl.trim()) rows.push("공개 URL 갱신");
  }

  if (log.stage === "report") {
    const score = numberValue(metadata.final_quality_score);
    if (score !== null) rows.push(`최종 품질 ${score.toFixed(1)}`);
    const gameplay = numberValue(metadata.final_gameplay_score);
    if (gameplay !== null) rows.push(`최종 게임성 ${gameplay.toFixed(1)}`);
  }

  if (rows.length === 0 && typeof log.reason === "string" && log.reason.trim()) {
    rows.push(`사유 ${log.reason}`);
  }

  return rows.slice(0, 2);
}
