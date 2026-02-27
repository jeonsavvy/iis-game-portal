import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { jsonError } from "@/lib/api/error-response";

const APPROVABLE_STAGES = new Set(["plan", "style", "build", "qa", "publish", "echo"]);

export async function POST(request: Request) {
  return runAdminWriteRoute(request, async () => {
    const body = (await request.json()) as { pipelineId?: string; stage?: string };
    const pipelineId = body.pipelineId?.trim();
    const stage = body.stage?.trim().toLowerCase();

    if (!pipelineId) {
      return jsonError({ status: 400, error: "pipelineId is required", code: "invalid_pipeline_id" });
    }
    if (!stage || !APPROVABLE_STAGES.has(stage)) {
      return jsonError({ status: 400, error: "stage is invalid", code: "invalid_stage" });
    }

    return await forwardToCoreEngine({
      path: `/api/v1/pipelines/${pipelineId}/approvals`,
      method: "POST",
      timeoutMs: 15000,
      retries: 1,
      body: { stage },
    });
  });
}
