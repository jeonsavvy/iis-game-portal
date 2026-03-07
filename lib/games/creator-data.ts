import { cache } from "react";

import { PREVIEW_CREATORS, PREVIEW_GAMES } from "@/lib/demo/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type GameRow = Database["public"]["Tables"]["games_metadata"]["Row"];

export type CreatorProfile = {
  id: string;
  alias: string;
  headline: string;
  gameCount: number;
};

function buildAliasFromId(id: string): string {
  return `creator-${id.slice(0, 6)}`;
}

export const loadCreatorProfile = cache(async (creatorId: string | null | undefined): Promise<CreatorProfile | null> => {
  if (!creatorId) return null;

  if (process.env.IIS_DEMO_PREVIEW === "1") {
    const preview = PREVIEW_CREATORS[creatorId as keyof typeof PREVIEW_CREATORS];
    if (!preview) return null;
    const gameCount = PREVIEW_GAMES.filter((game) => game.created_by === creatorId && game.status === "active").length;
    return { ...preview, gameCount };
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return {
      id: creatorId,
      alias: buildAliasFromId(creatorId),
      headline: "AI 게임을 만들고 퍼블리시하는 제작자",
      gameCount: 0,
    };
  }
  const { data: games } = await supabase.from("games_metadata").select("id").eq("created_by", creatorId).eq("status", "active");

  return {
    id: creatorId,
    alias: buildAliasFromId(creatorId),
    headline: "AI 게임을 만들고 퍼블리시하는 제작자",
    gameCount: Array.isArray(games) ? games.length : 0,
  };
});

export const loadGamesByCreator = cache(async (creatorId: string): Promise<GameRow[]> => {
  if (process.env.IIS_DEMO_PREVIEW === "1") {
    return PREVIEW_GAMES.filter((game) => game.created_by === creatorId && game.status === "active");
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return [];
  }
  const { data } = await supabase.from("games_metadata").select("*").eq("created_by", creatorId).eq("status", "active").order("created_at", { ascending: false });
  return (data ?? []) as GameRow[];
});
