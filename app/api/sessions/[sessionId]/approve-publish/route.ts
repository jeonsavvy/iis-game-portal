import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminWriteRoute(request, async () => {
    const { sessionId } = await context.params;
    const body = (await request.json()) as { note?: string };

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/approve-publish`,
      method: "POST",
      timeoutMs: 15000,
      retries: 1,
      body: {
        note: body.note ?? "",
      },
    });
  });
}
