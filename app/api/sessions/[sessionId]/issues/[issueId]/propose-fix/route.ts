import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string; issueId: string }> },
) {
  return runAdminWriteRoute(request, async () => {
    const { sessionId, issueId } = await context.params;
    const body = (await request.json()) as {
      instruction?: string;
      image_attachment?: {
        name?: string;
        mime_type?: string;
        data_url?: string;
      };
    };

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/issues/${encodeURIComponent(issueId)}/propose-fix`,
      method: "POST",
      timeoutMs: 120000,
      retries: 0,
      body: {
        instruction: body.instruction ?? "",
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
