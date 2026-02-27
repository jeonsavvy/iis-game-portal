import { runAdminReadRoute } from "@/lib/api/admin-read-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { jsonError } from "@/lib/api/error-response";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" } as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pipelineId = url.searchParams.get("pipelineId")?.trim() || "";

  if (!pipelineId) {
    return jsonError({ status: 400, error: "pipelineId is required", code: "invalid_pipeline_id" });
  }

  return runAdminReadRoute(
    async () =>
      forwardToCoreEngine({
        path: `/api/v1/pipelines/${pipelineId}`,
        method: "GET",
        timeoutMs: 15000,
        retries: 3,
        responseHeaders: NO_STORE_HEADERS,
      }),
    { errorHeaders: NO_STORE_HEADERS },
  );
}
