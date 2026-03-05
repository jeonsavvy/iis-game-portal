import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminWriteRoute(request, async () => {
    const { sessionId } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      details?: string;
      category?: string;
    };

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/issues`,
      method: "POST",
      timeoutMs: 15000,
      retries: 1,
      body: {
        title: body.title ?? "",
        details: body.details ?? "",
        category: body.category ?? "gameplay",
      },
    });
  });
}
