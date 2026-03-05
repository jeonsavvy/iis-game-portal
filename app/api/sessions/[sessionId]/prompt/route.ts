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
    };

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/prompt`,
      method: "POST",
      timeoutMs: 45000,
      retries: 1,
      body: {
        prompt: body.prompt ?? "",
        auto_qa: body.auto_qa !== false,
        stream: false,
      },
    });
  });
}
