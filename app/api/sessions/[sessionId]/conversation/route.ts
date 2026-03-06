import { runAdminReadRoute } from "@/lib/api/admin-read-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminReadRoute(async () => {
    const { sessionId } = await context.params;
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit")?.trim();

    const query = new URLSearchParams();
    if (limit) query.set("limit", limit);

    const suffix = query.toString();
    const path = suffix
      ? `/api/v1/sessions/${encodeURIComponent(sessionId)}/conversation?${suffix}`
      : `/api/v1/sessions/${encodeURIComponent(sessionId)}/conversation`;

    return forwardToCoreEngine({
      path,
      method: "GET",
      timeoutMs: 12000,
      retries: 3,
      responseHeaders: { "Cache-Control": "no-store, max-age=0" },
    });
  });
}
