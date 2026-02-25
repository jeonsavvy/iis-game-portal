import { NextResponse } from "next/server";

import { withAdminGuard } from "@/lib/api/admin-guard";
import { jsonError } from "@/lib/api/error-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pipelineId = url.searchParams.get("pipelineId")?.trim() || null;
  const limitParam = Number(url.searchParams.get("limit") ?? "180");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 300) : 180;

  const auth = await withAdminGuard("pipeline:read", {
    errorHeaders: { "Cache-Control": "no-store, max-age=0" },
  });
  if (auth instanceof NextResponse) {
    return auth;
  }

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
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  return NextResponse.json(
    { logs: data ?? [] },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
