import { NextResponse } from "next/server";

import { canInsertAdminConfig } from "@/lib/auth/rbac";
import { fetchWithRetry } from "@/lib/http/fetch-with-retry";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

const APPROVABLE_STAGES = new Set(["plan", "style", "build", "qa", "publish", "echo"]);

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;

    if (!canInsertAdminConfig(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { pipelineId?: string; stage?: string };
    const pipelineId = body.pipelineId?.trim();
    const stage = body.stage?.trim().toLowerCase();

    if (!pipelineId) {
      return NextResponse.json({ error: "pipelineId is required" }, { status: 400 });
    }
    if (!stage || !APPROVABLE_STAGES.has(stage)) {
      return NextResponse.json({ error: "stage is invalid" }, { status: 400 });
    }

    const coreEngineUrl = process.env.CORE_ENGINE_URL;
    if (!coreEngineUrl) {
      return NextResponse.json({ error: "CORE_ENGINE_URL is missing" }, { status: 500 });
    }

    const response = await fetchWithRetry(
      `${coreEngineUrl.replace(/\/$/, "")}/api/v1/pipelines/${pipelineId}/approvals`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CORE_ENGINE_API_TOKEN ? { Authorization: `Bearer ${process.env.CORE_ENGINE_API_TOKEN}` } : {}),
        },
        body: JSON.stringify({ stage }),
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

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Core engine unavailable",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 502 },
    );
  }
}
