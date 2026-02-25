import { NextResponse } from "next/server";

import { withAdminGuard } from "@/lib/api/admin-guard";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { jsonError } from "@/lib/api/error-response";
import { sanitizeTriggerKeyword } from "@/lib/text/trigger-keyword";

function resolveIdempotencyKey(request: Request): string {
  const fromHeader = request.headers.get("Idempotency-Key")?.trim();
  if (fromHeader) {
    return fromHeader;
  }

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `iid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function POST(request: Request) {
  try {
    const auth = await withAdminGuard("pipeline:write");
    if (auth instanceof NextResponse) {
      return auth;
    }

    const body = (await request.json()) as {
      keyword?: string;
      execution_mode?: "auto" | "manual";
      pipeline_version?: string;
    };
    const keyword = sanitizeTriggerKeyword(body.keyword ?? "");
    const executionMode = body.execution_mode === "manual" ? "manual" : "auto";
    const pipelineVersion = body.pipeline_version?.trim() || "forgeflow-v1";
    const idempotencyKey = resolveIdempotencyKey(request);

    if (!keyword) {
      return jsonError({ status: 400, error: "keyword is required", code: "invalid_keyword" });
    }

    return forwardToCoreEngine({
      path: "/api/v1/pipelines/trigger",
      method: "POST",
      timeoutMs: 15000,
      retries: 3,
      headers: { "Idempotency-Key": idempotencyKey },
      body: {
        keyword,
        source: "console",
        requested_by: auth.userId,
        execution_mode: executionMode,
        pipeline_version: pipelineVersion,
        idempotency_key: idempotencyKey,
      },
    });
  } catch (error) {
    return jsonError({
      status: 502,
      error: "Core engine unavailable",
      detail: error instanceof Error ? error.message : "unknown_error",
      code: "core_engine_unavailable",
    });
  }
}
