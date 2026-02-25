import { NextResponse } from "next/server";

import { withAdminGuard } from "@/lib/api/admin-guard";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { jsonError } from "@/lib/api/error-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pipelineId = url.searchParams.get("pipelineId")?.trim() || "";

    if (!pipelineId) {
      return jsonError({ status: 400, error: "pipelineId is required", code: "invalid_pipeline_id" });
    }

    const auth = await withAdminGuard("pipeline:read", {
      errorHeaders: { "Cache-Control": "no-store, max-age=0" },
    });
    if (auth instanceof NextResponse) {
      return auth;
    }

    return forwardToCoreEngine({
      path: `/api/v1/pipelines/${pipelineId}`,
      method: "GET",
      timeoutMs: 15000,
      retries: 3,
      responseHeaders: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return jsonError({
      status: 502,
      error: "Core engine unavailable",
      detail: error instanceof Error ? error.message : "unknown_error",
      code: "core_engine_unavailable",
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
