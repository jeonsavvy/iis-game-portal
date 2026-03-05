import { runAdminReadRoute } from "@/lib/api/admin-read-route";
import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";

export async function GET(request: Request) {
  return runAdminReadRoute(async () => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status")?.trim();
    const limit = url.searchParams.get("limit")?.trim();

    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (limit) query.set("limit", limit);

    const suffix = query.toString();
    const path = suffix ? `/api/v1/sessions?${suffix}` : "/api/v1/sessions";

    return forwardToCoreEngine({
      path,
      method: "GET",
      timeoutMs: 12000,
      retries: 3,
      responseHeaders: { "Cache-Control": "no-store, max-age=0" },
    });
  });
}

export async function POST(request: Request) {
  return runAdminWriteRoute(request, async () => {
    const body = (await request.json()) as { title?: string; genre_hint?: string };

    return forwardToCoreEngine({
      path: "/api/v1/sessions",
      method: "POST",
      timeoutMs: 15000,
      retries: 1,
      body: {
        title: body.title?.trim() ?? "",
        genre_hint: body.genre_hint?.trim() ?? "",
      },
    });
  });
}
