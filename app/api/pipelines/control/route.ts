import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { jsonError } from "@/lib/api/error-response";

const CONTROL_ACTIONS = new Set(["pause", "resume", "cancel", "retry"]);

export async function POST(request: Request) {
  return runAdminWriteRoute(request, async () => {
    const body = (await request.json()) as { pipelineId?: string; action?: string };
    const pipelineId = body.pipelineId?.trim();
    const action = body.action?.trim().toLowerCase();

    if (!pipelineId) {
      return jsonError({ status: 400, error: "pipelineId is required", code: "invalid_pipeline_id" });
    }
    if (!action || !CONTROL_ACTIONS.has(action)) {
      return jsonError({ status: 400, error: "action is invalid", code: "invalid_action" });
    }

    return await forwardToCoreEngine({
      path: `/api/v1/pipelines/${pipelineId}/controls`,
      method: "POST",
      timeoutMs: 15000,
      retries: 1,
      body: { action },
    });
  });
}
