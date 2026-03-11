import { runAdminReadRoute } from "@/lib/api/admin-read-route";
import { buildCoreActorHeaders, forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminReadRoute(async (auth) => {
    const { sessionId } = await context.params;
    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/issues/latest`,
      method: "GET",
      headers: buildCoreActorHeaders(auth),
      timeoutMs: 12000,
      retries: 3,
      responseHeaders: { "Cache-Control": "no-store, max-age=0" },
    });
  });
}
