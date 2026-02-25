import { NextResponse } from "next/server";

import { withAdminGuard } from "@/lib/api/admin-guard";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { jsonError } from "@/lib/api/error-response";

type DeleteGameBody = {
  gameId?: string;
  confirmSlug?: string;
};

export async function POST(request: Request) {
  try {
    const auth = await withAdminGuard("pipeline:write");
    if (auth instanceof NextResponse) {
      return auth;
    }

    const body = (await request.json()) as DeleteGameBody;
    const gameId = body.gameId?.trim();
    const confirmSlug = body.confirmSlug?.trim();

    if (!gameId) {
      return jsonError({ status: 400, error: "gameId is required", code: "invalid_game_id" });
    }
    if (!confirmSlug) {
      return jsonError({ status: 400, error: "confirmSlug is required", code: "invalid_confirm_slug" });
    }

    const { data: game } = await auth.supabase.from("games_metadata").select("id,slug").eq("id", gameId).single();
    if (!game) {
      return jsonError({ status: 404, error: "Game not found", code: "game_not_found" });
    }
    if ((game as { slug?: string }).slug !== confirmSlug) {
      return jsonError({ status: 400, error: "Slug confirmation mismatch", code: "slug_mismatch" });
    }

    return forwardToCoreEngine({
      path: `/api/v1/games/${encodeURIComponent(gameId)}`,
      method: "DELETE",
      timeoutMs: 20000,
      retries: 2,
      body: {
        delete_storage: true,
        delete_archive: true,
        reason: "admin_manual_delete",
      },
    });
  } catch (error) {
    return jsonError({
      status: 502,
      error: "Core engine unavailable",
      detail: error instanceof Error ? error.message : "unknown_error",
      code: "core_engine_unavailable",
    });
  }
}
