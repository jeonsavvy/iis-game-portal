import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/error-response";
import { ensureNoStoreHeaders } from "@/lib/api/response-headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PLAY_EVENT_COOLDOWN_MS = 30 * 60 * 1000;

function resolveFingerprintHash(request: Request): string {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const clientIp = headers.get("cf-connecting-ip")?.trim() ?? forwardedFor;
  const userAgent = headers.get("user-agent")?.trim() ?? "unknown";

  return createHash("sha256").update(`${clientIp}|${userAgent}`).digest("hex");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();
    const { data, error: gameError } = await supabase.from("games_metadata").select("id,slug,play_count_cached").eq("slug", id).maybeSingle();
    const game = data as { id: string; slug: string; play_count_cached?: number | null } | null;

    if (gameError || !game) {
      return ensureNoStoreHeaders(jsonError({ status: 404, error: "Game not found", code: "game_not_found" }));
    }

    const fingerprintHash = resolveFingerprintHash(request);
    const { data: latestEvent, error: latestEventError } = await supabase
      .from("game_play_events")
      .select("created_at")
      .eq("game_id", game.id)
      .eq("fingerprint_hash", fingerprintHash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestEventError) {
      return ensureNoStoreHeaders(jsonError({ status: 502, error: latestEventError.message, code: "play_event_lookup_failed" }));
    }
    const latestCreatedAt = typeof (latestEvent as { created_at?: string } | null)?.created_at === "string"
      ? Date.parse(String((latestEvent as { created_at?: string }).created_at))
      : Number.NaN;
    const shouldCountPlay = !Number.isFinite(latestCreatedAt) || (Date.now() - latestCreatedAt) >= PLAY_EVENT_COOLDOWN_MS;

    if (shouldCountPlay) {
      const { error: insertError } = await supabase.from("game_play_events").insert({
        game_id: game.id,
        fingerprint_hash: fingerprintHash,
        source: "portal",
      });
      if (insertError) {
        return ensureNoStoreHeaders(jsonError({ status: 502, error: insertError.message, code: "play_event_insert_failed" }));
      }
    }

    let playCount = Number(game.play_count_cached ?? 0);
    if (shouldCountPlay) {
      const { count, error: countError } = await supabase
        .from("game_play_events")
        .select("id", { count: "exact", head: true })
        .eq("game_id", game.id);

      if (countError) {
        return ensureNoStoreHeaders(jsonError({ status: 502, error: countError.message, code: "play_event_count_failed" }));
      }

      playCount = typeof count === "number" ? count : playCount;
      const { error: updateError } = await supabase.from("games_metadata").update({ play_count_cached: playCount }).eq("id", game.id);
      if (updateError) {
        return ensureNoStoreHeaders(jsonError({ status: 502, error: updateError.message, code: "play_count_update_failed" }));
      }
    }

    return ensureNoStoreHeaders(
      NextResponse.json(
        {
          ok: true,
          counted: shouldCountPlay,
          gameId: game.id,
          slug: game.slug,
          playCount,
        },
        { status: shouldCountPlay ? 201 : 200 },
      ),
    );
  } catch (error) {
    return ensureNoStoreHeaders(
      jsonError({
        status: 502,
        error: "Play event unavailable",
        detail: error instanceof Error ? error.message : "unknown_error",
        code: "play_event_unavailable",
      }),
    );
  }
}
