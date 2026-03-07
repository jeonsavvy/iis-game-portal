import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { buildCoreActorHeaders, forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string; issueId: string }> },
) {
  return runAdminWriteRoute(request, async (auth) => {
    const { sessionId, issueId } = await context.params;
    const body = (await request.json()) as { proposal_id?: string };

    return forwardToCoreEngine({
      path: `/api/v1/sessions/${encodeURIComponent(sessionId)}/issues/${encodeURIComponent(issueId)}/apply-fix`,
      method: "POST",
      timeoutMs: 30000,
      retries: 0,
      headers: buildCoreActorHeaders(auth),
      body: {
        proposal_id: body.proposal_id ?? null,
      },
    });
  });
}
