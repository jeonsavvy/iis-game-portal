import { runAdminReadRoute } from "@/lib/api/admin-read-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminReadRoute(async () => {
    const { sessionId } = await context.params;

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/publish-thumbnail-candidates`,
      method: "GET",
      timeoutMs: 30000,
      retries: 1,
      responseHeaders: { "Cache-Control": "no-store, max-age=0" },
    });
  });
}
