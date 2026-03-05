import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminWriteRoute(request, async () => {
    const { sessionId } = await context.params;

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/cancel`,
      method: "POST",
      timeoutMs: 10000,
      retries: 1,
      body: {},
    });
  });
}
