import { NextResponse } from "next/server";

import { canReadPipelineLogs } from "@/lib/auth/rbac";
import { fetchWithRetry } from "@/lib/http/fetch-with-retry";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pipelineId = url.searchParams.get("pipelineId")?.trim() || "";

    if (!pipelineId) {
      return NextResponse.json({ error: "pipelineId is required" }, { status: 400 });
    }

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

    const coreEngineUrl = process.env.CORE_ENGINE_URL;
    if (!coreEngineUrl) {
      return NextResponse.json({ error: "CORE_ENGINE_URL is missing" }, { status: 500 });
    }

    const response = await fetchWithRetry(
      `${coreEngineUrl.replace(/\/$/, "")}/api/v1/pipelines/${pipelineId}`,
      {
        method: "GET",
        headers: {
          ...(process.env.CORE_ENGINE_API_TOKEN ? { Authorization: `Bearer ${process.env.CORE_ENGINE_API_TOKEN}` } : {}),
        },
        cache: "no-store",
      },
      { timeoutMs: 15000, retries: 3 },
    );

    const rawBody = await response.text();
    let data: unknown;
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      data = { error: rawBody || "Core engine returned non-JSON response" };
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Core engine unavailable",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
