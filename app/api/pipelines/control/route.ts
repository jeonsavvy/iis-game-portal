import { NextResponse } from "next/server";

import { withAdminGuard } from "@/lib/api/admin-guard";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { jsonError } from "@/lib/api/error-response";

const CONTROL_ACTIONS = new Set(["pause", "resume", "cancel", "retry"]);

export async function POST(request: Request) {
  try {
    const auth = await withAdminGuard("pipeline:write");
    if (auth instanceof NextResponse) {
      return auth;
    }

    const body = (await request.json()) as { pipelineId?: string; action?: string };
    const pipelineId = body.pipelineId?.trim();
    const action = body.action?.trim().toLowerCase();

    if (!pipelineId) {
      return jsonError({ status: 400, error: "pipelineId is required", code: "invalid_pipeline_id" });
    }
    if (!action || !CONTROL_ACTIONS.has(action)) {
      return jsonError({ status: 400, error: "action is invalid", code: "invalid_action" });
    }

    return forwardToCoreEngine({
      path: `/api/v1/pipelines/${pipelineId}/controls`,
      method: "POST",
      timeoutMs: 15000,
      retries: 3,
      body: { action },
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
