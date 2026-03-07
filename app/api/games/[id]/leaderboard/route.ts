import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/error-response";
import { ensureNoStoreHeaders } from "@/lib/api/response-headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LeaderboardRow = {
  id: number;
  player_name: string;
  score: number;
  created_at: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "10", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 20) : 10;

    const supabase = await createSupabaseServerClient();
    const { data, error: gameError } = await supabase.from("games_metadata").select("id,slug").eq("slug", id).maybeSingle();
    const game = data as { id: string; slug: string } | null;
    if (gameError || !game) {
      return ensureNoStoreHeaders(jsonError({ status: 404, error: "Game not found", code: "game_not_found" }));
    }

    const { data: leaderboardData, error } = await supabase
      .from("leaderboard")
      .select("id,player_name,score,created_at")
      .eq("game_id", game.id)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      return ensureNoStoreHeaders(jsonError({ status: 502, error: error.message, code: "leaderboard_unavailable" }));
    }

    const leaderboard = ((leaderboardData ?? []) as LeaderboardRow[]).map((row, index) => ({
      rank: index + 1,
      id: row.id,
      playerName: row.player_name,
      score: row.score,
      createdAt: row.created_at,
    }));

    return ensureNoStoreHeaders(
      NextResponse.json({
        gameId: game.id,
        slug: game.slug,
        leaderboard,
      }),
    );
  } catch (error) {
    return ensureNoStoreHeaders(
      jsonError({
        status: 502,
        error: "Leaderboard unavailable",
        detail: error instanceof Error ? error.message : "unknown_error",
        code: "leaderboard_unavailable",
      }),
    );
  }
}
