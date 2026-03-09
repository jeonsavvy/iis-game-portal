// 포털 BFF가 Core Engine으로 요청을 넘길 때 사용하는 공통 어댑터입니다.
// 인증 헤더, timeout, 재시도, 에러 정규화를 여기서 맞춰 개별 라우트가 얇게 유지되게 합니다.

import { NextResponse } from "next/server";

import type { AdminGuardContext } from "@/lib/api/admin-guard";
import { jsonError, normalizeCoreErrorPayload } from "@/lib/api/error-response";
import { fetchWithRetry } from "@/lib/http/fetch-with-retry";

type ForwardToCoreEngineArgs = {
  path: string;
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  timeoutMs?: number;
  retries?: number;
  responseHeaders?: HeadersInit;
};

// --- Target resolution and response parsing -------------------------------
function resolveCoreEngineUrl(path: string): string | null {
  const coreEngineUrl = process.env.CORE_ENGINE_URL;
  if (!coreEngineUrl) {
    return null;
  }
  return `${coreEngineUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function parseCoreResponse(rawBody: string): unknown {
  if (!rawBody) {
    return {};
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return { error: rawBody };
  }
}

export function buildCoreActorHeaders(auth: Pick<AdminGuardContext, "userId" | "role">): HeadersInit {
  return {
    "X-IIS-Actor-Id": auth.userId,
    "X-IIS-Actor-Role": auth.role ?? "unknown",
  };
}

// --- Forwarding with auth and retry policy --------------------------------
export async function forwardToCoreEngine({
  path,
  method = "GET",
  body,
  headers,
  timeoutMs = 15000,
  retries = 3,
  responseHeaders,
}: ForwardToCoreEngineArgs): Promise<NextResponse> {
  const targetUrl = resolveCoreEngineUrl(path);
  if (!targetUrl) {
    return jsonError({
      status: 500,
      error: "CORE_ENGINE_URL is missing",
      code: "core_engine_url_missing",
      headers: responseHeaders,
    });
  }

  const requestHeaders = new Headers(headers);
  if (method !== "GET" && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const configuredApiToken = process.env.CORE_ENGINE_API_TOKEN?.trim();
  const hasAuthorizationHeader = Boolean(requestHeaders.get("Authorization")?.trim());
  const productionMode = process.env.NODE_ENV === "production";
  if (productionMode && !configuredApiToken && !hasAuthorizationHeader) {
    return jsonError({
      status: 500,
      error: "CORE_ENGINE_API_TOKEN is missing",
      code: "core_engine_api_token_missing",
      headers: responseHeaders,
    });
  }

  if (configuredApiToken && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${configuredApiToken}`);
  }

  try {
    const response = await fetchWithRetry(
      targetUrl,
      {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
      },
      { timeoutMs, retries },
    );

    const rawBody = await response.text();
    const parsed = parseCoreResponse(rawBody);

    if (response.ok) {
      return NextResponse.json(parsed, { status: response.status, headers: responseHeaders });
    }

    return NextResponse.json(normalizeCoreErrorPayload(parsed, response.statusText || "Core engine request failed"), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return jsonError({
      status: 502,
      error: "Core engine unavailable",
      detail: error instanceof Error ? error.message : "unknown_error",
      code: "core_engine_unavailable",
      headers: responseHeaders,
    });
  }
}
