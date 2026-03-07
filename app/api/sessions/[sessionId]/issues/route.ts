import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { buildCoreActorHeaders, forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminWriteRoute(request, async (auth) => {
    const { sessionId } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      details?: string;
      category?: string;
      image_attachment?: {
        name?: string;
        mime_type?: string;
        data_url?: string;
      };
    };

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/issues`,
      method: "POST",
      timeoutMs: 15000,
      retries: 1,
      headers: buildCoreActorHeaders(auth),
      body: {
        title: body.title ?? "",
        details: body.details ?? "",
        category: body.category ?? "auto",
        image_attachment: body.image_attachment
          ? {
              name: body.image_attachment.name ?? "",
              mime_type: body.image_attachment.mime_type ?? "",
              data_url: body.image_attachment.data_url ?? "",
            }
          : undefined,
      },
    });
  });
}
