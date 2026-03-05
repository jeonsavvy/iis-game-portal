import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminWriteRoute(request, async () => {
    const { sessionId } = await context.params;
    const body = (await request.json()) as { game_name?: string; slug?: string };

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/publish`,
      method: "POST",
      timeoutMs: 30000,
      retries: 1,
      body: {
        game_name: body.game_name?.trim() ?? "",
        slug: body.slug?.trim() ?? "",
      },
    });
  });
}
