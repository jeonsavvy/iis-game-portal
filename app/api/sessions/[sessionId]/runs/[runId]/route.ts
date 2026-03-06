import { runAdminReadRoute } from "@/lib/api/admin-read-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string; runId: string }> },
) {
  return runAdminReadRoute(async () => {
    const { sessionId, runId } = await context.params;

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(runId)}`,
      method: "GET",
      timeoutMs: 20000,
      retries: 4,
      responseHeaders: { "Cache-Control": "no-store, max-age=0" },
    });
  });
}
