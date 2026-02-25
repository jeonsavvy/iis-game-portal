import { NextResponse } from "next/server";

export type NormalizedApiError = {
  error: string;
  detail?: unknown;
  code?: string;
};

type JsonErrorArgs = {
  status: number;
  error: string;
  detail?: unknown;
  code?: string;
  headers?: HeadersInit;
};

export function jsonError({ status, error, detail, code, headers }: JsonErrorArgs): NextResponse {
  const payload: NormalizedApiError = { error };
  if (detail !== undefined) {
    payload.detail = detail;
  }
  if (code) {
    payload.code = code;
  }
  return NextResponse.json(payload, { status, headers });
}

export function normalizeCoreErrorPayload(payload: unknown, statusText: string): NormalizedApiError {
  if (payload && typeof payload === "object") {
    const row = payload as Record<string, unknown>;
    const nestedDetail = row.detail;
    const detailRecord = nestedDetail && typeof nestedDetail === "object" ? (nestedDetail as Record<string, unknown>) : null;
    const detailReason = detailRecord && typeof detailRecord.reason === "string" ? detailRecord.reason : null;
    const reason = typeof row.reason === "string" ? row.reason : null;
    const code = typeof row.code === "string" ? row.code : detailReason ?? reason ?? undefined;

    const baseError =
      typeof row.error === "string" && row.error.trim()
        ? row.error
        : typeof nestedDetail === "string" && nestedDetail.trim()
          ? nestedDetail
          : code ?? statusText;

    const normalized: NormalizedApiError = { error: baseError };
    if (nestedDetail !== undefined) {
      normalized.detail = nestedDetail;
    } else {
      normalized.detail = row;
    }
    if (code) {
      normalized.code = code;
    }
    return normalized;
  }

  if (typeof payload === "string" && payload.trim()) {
    return { error: payload, detail: payload };
  }

  return { error: statusText || "Core engine request failed" };
}

