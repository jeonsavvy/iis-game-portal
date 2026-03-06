type PollFailureInput = {
  status?: number;
  message?: string;
  payload?: unknown;
};

function extractStrings(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const row = payload as Record<string, unknown>;
  const values = [row.error, row.code, row.detail];
  const nestedDetail = row.detail;
  if (nestedDetail && typeof nestedDetail === "object") {
    const detailRow = nestedDetail as Record<string, unknown>;
    values.push(detailRow.error, detailRow.code, detailRow.reason);
  }

  return values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export function isTransientCoreEnginePollFailure({ status, message, payload }: PollFailureInput): boolean {
  const haystack = [message ?? "", ...extractStrings(payload)].join(" ").toLowerCase();

  if (!haystack) {
    return Boolean(status && status >= 500);
  }

  if (haystack.includes("core_engine_unavailable")) return true;
  if (haystack.includes("core engine unavailable")) return true;
  if (haystack.includes("the operation was aborted")) return true;
  if (haystack.includes("abort")) return true;
  if (haystack.includes("timeout")) return true;

  return Boolean(status && status >= 500);
}
