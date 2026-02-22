import { NextResponse } from "next/server";

import { canInsertAdminConfig } from "@/lib/auth/rbac";
import { fetchWithRetry } from "@/lib/http/fetch-with-retry";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

type DeleteGameBody = {
  gameId?: string;
  confirmSlug?: string;
};

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

    const body = (await request.json()) as DeleteGameBody;
    const gameId = body.gameId?.trim();
    const confirmSlug = body.confirmSlug?.trim();

    if (!gameId) {
      return NextResponse.json({ error: "gameId is required" }, { status: 400 });
    }
    if (!confirmSlug) {
      return NextResponse.json({ error: "confirmSlug is required" }, { status: 400 });
    }

    const { data: game } = await supabase.from("games_metadata").select("id,slug").eq("id", gameId).single();
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    if ((game as { slug?: string }).slug !== confirmSlug) {
      return NextResponse.json({ error: "Slug confirmation mismatch" }, { status: 400 });
    }

    const coreEngineUrl = process.env.CORE_ENGINE_URL;
    if (!coreEngineUrl) {
      return NextResponse.json({ error: "CORE_ENGINE_URL is missing" }, { status: 500 });
    }

    const response = await fetchWithRetry(
      `${coreEngineUrl.replace(/\/$/, "")}/api/v1/games/${encodeURIComponent(gameId)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CORE_ENGINE_API_TOKEN ? { Authorization: `Bearer ${process.env.CORE_ENGINE_API_TOKEN}` } : {}),
        },
        body: JSON.stringify({
          delete_storage: true,
          delete_archive: true,
          reason: "admin_manual_delete",
        }),
        cache: "no-store",
      },
      { timeoutMs: 20000, retries: 2 },
    );

    const raw = await response.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { error: raw || "Core engine returned non-JSON response" };
    }

    if (data && typeof data === "object" && "detail" in data) {
      const detail = (data as { detail?: unknown }).detail;
      if (detail && typeof detail === "object") {
        const detailObj = detail as Record<string, unknown>;
        data = {
          ...(data as Record<string, unknown>),
          reason:
            (typeof detailObj.reason === "string" && detailObj.reason) ||
            (typeof (data as Record<string, unknown>).reason === "string"
              ? (data as Record<string, unknown>).reason
              : undefined),
          error:
            (typeof detailObj.reason === "string" && detailObj.reason) ||
            (typeof detailObj.error === "string" && detailObj.error) ||
            (typeof (data as Record<string, unknown>).error === "string"
              ? (data as Record<string, unknown>).error
              : undefined),
          detail: detailObj,
        };
      }
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
