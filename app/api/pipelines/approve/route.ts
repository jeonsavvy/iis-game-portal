import { NextResponse } from "next/server";

import { withAdminGuard } from "@/lib/api/admin-guard";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { jsonError } from "@/lib/api/error-response";

const APPROVABLE_STAGES = new Set(["plan", "style", "build", "qa", "publish", "echo"]);

export async function POST(request: Request) {
  try {
    const auth = await withAdminGuard("pipeline:write");
    if (auth instanceof NextResponse) {
      return auth;
    }

    const body = (await request.json()) as { pipelineId?: string; stage?: string };
    const pipelineId = body.pipelineId?.trim();
    const stage = body.stage?.trim().toLowerCase();

    if (!pipelineId) {
      return jsonError({ status: 400, error: "pipelineId is required", code: "invalid_pipeline_id" });
    }
    if (!stage || !APPROVABLE_STAGES.has(stage)) {
      return jsonError({ status: 400, error: "stage is invalid", code: "invalid_stage" });
    }

    return forwardToCoreEngine({
      path: `/api/v1/pipelines/${pipelineId}/approvals`,
      method: "POST",
      timeoutMs: 15000,
      retries: 3,
      body: { stage },
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
