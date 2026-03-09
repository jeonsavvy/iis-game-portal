import { cache } from "react";

import { PREVIEW_GAMES, PREVIEW_LEADERBOARDS, getPreviewGameById, getPreviewGameBySlug } from "@/lib/demo/preview-data";
import { resolveGameImage } from "@/lib/games/presentation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type GameRow = Database["public"]["Tables"]["games_metadata"]["Row"];
type LeaderboardRow = Database["public"]["Tables"]["leaderboard"]["Row"];

export function isPreviewMode(): boolean {
  return process.env.IIS_DEMO_PREVIEW === "1";
}

function isPubliclyVisible(game: GameRow): boolean {
  return game.status === "active" && game.visibility !== "hidden";
}

export function hasLiveCatalogImage(game: Pick<GameRow, "thumbnail_url" | "hero_image_url" | "screenshot_url" | "genre" | "genre_primary" | "genre_tags">): boolean {
  const image = resolveGameImage(game);
  return Boolean(image && /^https?:\/\//.test(image.trim()));
}

export const loadCatalogGames = cache(async (): Promise<GameRow[]> => {
  if (isPreviewMode()) {
    return PREVIEW_GAMES.filter(isPubliclyVisible);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("games_metadata").select("*").eq("status", "active");
  return ((data ?? []) as GameRow[]).filter((game) => isPubliclyVisible(game) && hasLiveCatalogImage(game));
});

export const loadPublicGameBySlug = cache(async (slug: string): Promise<GameRow | null> => {
  if (isPreviewMode()) {
    const previewGame = getPreviewGameBySlug(slug) ?? getPreviewGameById(slug);
    return previewGame && isPubliclyVisible(previewGame) ? previewGame : null;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("games_metadata").select("*").eq("slug", slug).maybeSingle();
  const game = (data as GameRow | null) ?? null;
  return game && isPubliclyVisible(game) && hasLiveCatalogImage(game) ? game : null;
});

export const loadGameLeaderboard = cache(async (gameId: string, slug: string, limit = 10): Promise<LeaderboardRow[]> => {
  if (isPreviewMode()) {
    return (PREVIEW_LEADERBOARDS[slug] ?? []) as LeaderboardRow[];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as LeaderboardRow[];
});

export async function loadRelatedGames(game: GameRow, limit = 6): Promise<GameRow[]> {
  const rows = await loadCatalogGames();
  return rows.filter((row) => row.slug !== game.slug && (row.genre_primary ?? row.genre) === (game.genre_primary ?? game.genre)).slice(0, limit);
}
