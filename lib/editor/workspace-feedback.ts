export const RESTORE_BANNER_DELAY_MS = 350;

type FixReviewStateInput = {
  hasPreviewFix: boolean;
  historyCount: number;
};

function extractStrings(payload: unknown): string[] {
  if (typeof payload === "string") {
    return payload.trim() ? [payload.trim()] : [];
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const row = payload as Record<string, unknown>;
  const detail = row.detail;
  const nested = detail && typeof detail === "object" ? (detail as Record<string, unknown>) : null;
  const values = [
    row.error,
    row.code,
    typeof row.detail === "string" ? row.detail : null,
    nested?.error,
    nested?.code,
    nested?.reason,
  ];

  return values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function extractGenericMessage(payload: unknown): string {
  if (typeof payload === "string") {
    return payload.trim() || "요청 처리 중 오류가 발생했습니다";
  }
  if (!payload || typeof payload !== "object") {
    return "요청 처리 중 오류가 발생했습니다";
  }

  const row = payload as Record<string, unknown>;
  const detail = row.detail;
  if (detail && typeof detail === "object") {
    const detailRow = detail as Record<string, unknown>;
    const nestedError = detailRow.error;
    const nestedCode = detailRow.code;
    if (typeof nestedError === "string" && nestedError.trim()) {
      if (typeof nestedCode === "string" && nestedCode.trim()) {
        return `${nestedError} (${nestedCode})`;
      }
      return nestedError;
    }
  }

  if (typeof row.error === "string" && row.error.trim()) {
    const code = typeof row.code === "string" ? row.code.trim() : "";
    const nested = typeof row.detail === "string" ? row.detail.trim() : "";
    if (code && nested) return `${row.error} (${code}) · ${nested}`;
    if (code) return `${row.error} (${code})`;
    return row.error;
  }
  if (typeof row.detail === "string" && row.detail.trim()) return row.detail;
  return "요청 처리 중 오류가 발생했습니다";
}

export function normalizeWorkspaceError(payload: unknown): string {
  const strings = extractStrings(payload);
  const haystack = strings.join(" ").toLowerCase();

  if (
    haystack.includes("core_engine_unavailable")
    || haystack.includes("core engine unavailable")
    || haystack.includes("the operation was aborted")
    || haystack.includes("timeout")
    || haystack.includes("run_poll_timeout")
  ) {
    return "코어 엔진 연결이 잠시 불안정합니다. 잠시 후 다시 시도하면 이어서 작업할 수 있습니다.";
  }

  if (
    haystack.includes("scaffold_specialization_rejected")
    || haystack.includes("specialization rejected")
    || haystack.includes("scaffold_reverted_to_baseline")
  ) {
    return "요청한 장르 감각을 다듬는 중입니다. 기본 플레이 감각은 유지한 채 다시 보정하고 있습니다.";
  }

  return extractGenericMessage(payload);
}

export function buildFixReviewState({ hasPreviewFix, historyCount }: FixReviewStateInput) {
  return {
    canKeepCurrentVersion: hasPreviewFix,
    canApplyFix: hasPreviewFix,
    canRestorePrevious: historyCount > 0,
  };
}

export function normalizeWorkspaceStatusMessage(message: string): string {
  const lowered = message.trim().toLowerCase();
  if (
    lowered.includes("specialization rejected")
    || lowered.includes("scaffold_specialization_rejected")
    || lowered.includes("reverted to deterministic scaffold baseline")
  ) {
    return "장르 감각을 기준선 위에서 다시 보정했습니다. 플레이 가능한 상태를 유지한 채 다음 수정을 이어갈 수 있습니다.";
  }
  return message;
}
