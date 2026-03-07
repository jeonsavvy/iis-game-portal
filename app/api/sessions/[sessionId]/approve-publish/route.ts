import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { buildCoreActorHeaders, forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminWriteRoute(request, async (auth) => {
    const { sessionId } = await context.params;
    const body = (await request.json()) as { note?: string };

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/approve-publish`,
      method: "POST",
      timeoutMs: 15000,
      retries: 1,
      headers: buildCoreActorHeaders(auth),
      body: {
        note: body.note ?? "",
      },
    });
  }, { permission: "admin:write" });
}
