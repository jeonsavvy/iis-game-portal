import { NextResponse } from "next/server";

import { runAdminReadRoute } from "@/lib/api/admin-read-route";
import { jsonError } from "@/lib/api/error-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" } as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pipelineId = url.searchParams.get("pipelineId")?.trim() || null;
  const limitParam = Number(url.searchParams.get("limit") ?? "180");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 300) : 180;

  return runAdminReadRoute(
    async (auth) => {
      let query = auth.supabase.from("pipeline_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (pipelineId) {
        query = query.eq("pipeline_id", pipelineId);
      }

      const { data, error } = await query;
      if (error) {
        return jsonError({
          status: 500,
          error: "Failed to fetch pipeline logs",
          detail: error.message,
          code: "pipeline_logs_query_failed",
          headers: NO_STORE_HEADERS,
        });
      }

      return NextResponse.json(
        { logs: data ?? [] },
        { headers: NO_STORE_HEADERS },
      );
    },
    { errorHeaders: NO_STORE_HEADERS },
  );
}
