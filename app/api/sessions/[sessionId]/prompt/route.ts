import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return runAdminWriteRoute(request, async () => {
    const { sessionId } = await context.params;
    const body = (await request.json()) as {
      prompt?: string;
      auto_qa?: boolean;
      stream?: boolean;
      image_attachment?: {
        name?: string;
        mime_type?: string;
        data_url?: string;
      };
    };

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/prompt`,
      method: "POST",
      timeoutMs: 20000,
      retries: 0,
      body: {
        prompt: body.prompt ?? "",
        auto_qa: body.auto_qa !== false,
        stream: false,
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
