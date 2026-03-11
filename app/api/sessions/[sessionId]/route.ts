import { runAdminReadRoute } from "@/lib/api/admin-read-route";
import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { buildCoreActorHeaders, forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminReadRoute(async (auth) => {
    const { sessionId } = await context.params;
    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}`,
      method: "GET",
      headers: buildCoreActorHeaders(auth),
      timeoutMs: 10000,
      retries: 3,
      responseHeaders: { "Cache-Control": "no-store, max-age=0" },
    });
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminWriteRoute(request, async (auth) => {
    const { sessionId } = await context.params;
    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}`,
      method: "DELETE",
      timeoutMs: 10000,
      retries: 1,
      headers: buildCoreActorHeaders(auth),
    });
  });
}
