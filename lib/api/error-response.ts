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

function sanitizeErrorString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function sanitizeCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return /^[a-z0-9_.:-]{2,80}$/i.test(trimmed) ? trimmed : undefined;
}

export function jsonError({ status, error, detail, code, headers }: JsonErrorArgs): NextResponse {
  const safeError = sanitizeErrorString(error) ?? "Unknown error";
  const safeCode = sanitizeCode(code);
  const payload: NormalizedApiError = { error: safeError };
  if (detail !== undefined) {
    payload.detail = detail;
  }
  if (safeCode) {
    payload.code = safeCode;
  }
  return NextResponse.json(payload, { status, headers });
}

export function normalizeCoreErrorPayload(payload: unknown, statusText: string): NormalizedApiError {
  const fallbackError = sanitizeErrorString(statusText) ?? "Core engine request failed";

  if (payload && typeof payload === "object") {
    const row = payload as Record<string, unknown>;
    const nestedDetail = row.detail;
    const detailRecord = nestedDetail && typeof nestedDetail === "object" ? (nestedDetail as Record<string, unknown>) : null;
    const detailReason = sanitizeErrorString(detailRecord?.reason);
    const reason = sanitizeErrorString(row.reason);
    const code = sanitizeCode(row.code) ?? sanitizeCode(detailReason) ?? sanitizeCode(reason);

    const baseError = sanitizeErrorString(row.error) ?? sanitizeErrorString(nestedDetail) ?? code ?? fallbackError;

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

  const payloadError = sanitizeErrorString(payload);
  if (payloadError) {
    return { error: payloadError, detail: payloadError };
  }

  return { error: fallbackError };
}

export function coreEngineUnavailableError(error: unknown, headers?: HeadersInit): NextResponse {
  return jsonError({
    status: 502,
    error: "Core engine unavailable",
    detail: error instanceof Error ? error.message : "unknown_error",
    code: "core_engine_unavailable",
    headers,
  });
}
