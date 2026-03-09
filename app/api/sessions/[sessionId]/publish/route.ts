import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { buildCoreActorHeaders, forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminWriteRoute(request, async (auth) => {
    const { sessionId } = await context.params;
    const body = (await request.json()) as {
      game_name?: string;
      slug?: string;
      selected_thumbnail?: {
        name?: string;
        mime_type?: string;
        data_url?: string;
      };
    };

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/publish`,
      method: "POST",
      timeoutMs: 30000,
      retries: 1,
      headers: buildCoreActorHeaders(auth),
      body: {
        game_name: body.game_name?.trim() ?? "",
        slug: body.slug?.trim() ?? "",
        selected_thumbnail: body.selected_thumbnail
          ? {
              name: body.selected_thumbnail.name ?? "",
              mime_type: body.selected_thumbnail.mime_type ?? "",
              data_url: body.selected_thumbnail.data_url ?? "",
            }
          : undefined,
      },
    });
  });
}
