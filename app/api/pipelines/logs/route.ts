import { NextResponse } from "next/server";

import { canReadPipelineLogs } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pipelineId = url.searchParams.get("pipelineId")?.trim() || null;
  const limitParam = Number(url.searchParams.get("limit") ?? "180");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 300) : 180;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;

  if (!canReadPipelineLogs(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let query = supabase.from("pipeline_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}
