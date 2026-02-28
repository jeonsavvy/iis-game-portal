import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { jsonError } from "@/lib/api/error-response";
import { sanitizeTriggerKeyword } from "@/lib/text/trigger-keyword";

function resolveIdempotencyKey(request: Request): string {
  const fromHeader = request.headers.get("Idempotency-Key")?.trim();
  if (fromHeader) {
    return fromHeader;
  }

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `iid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function POST(request: Request) {
  return runAdminWriteRoute(request, async (auth) => {
    const body = (await request.json()) as {
      keyword?: string;
      pipeline_version?: string;
    };
    const keyword = sanitizeTriggerKeyword(body.keyword ?? "");
    const pipelineVersion = body.pipeline_version?.trim() || "forgeflow-v1";
    const idempotencyKey = resolveIdempotencyKey(request);

    if (!keyword) {
      return jsonError({ status: 400, error: "keyword is required", code: "invalid_keyword" });
    }

    return await forwardToCoreEngine({
      path: "/api/v1/pipelines/trigger",
      method: "POST",
      timeoutMs: 15000,
      retries: 3,
      headers: { "Idempotency-Key": idempotencyKey },
      body: {
        keyword,
        source: "console",
        requested_by: auth.userId,
        execution_mode: "auto",
        pipeline_version: pipelineVersion,
        idempotency_key: idempotencyKey,
      },
    });
  });
}
