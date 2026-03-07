import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { buildCoreActorHeaders, forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string; runId: string }> },
) {
  return runAdminWriteRoute(request, async (auth) => {
    const { sessionId, runId } = await context.params;

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(runId)}/cancel`,
      method: "POST",
      timeoutMs: 15000,
      retries: 0,
      headers: buildCoreActorHeaders(auth),
      body: {},
    });
  });
}
