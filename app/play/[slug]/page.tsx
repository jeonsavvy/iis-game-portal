import { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { PlayEmbedFrame } from "@/components/PlayEmbedFrame";
import { PlayInfoTabs } from "@/components/PlayInfoTabs";
import { PlayHeader } from "@/components/play/play-header";
import { PlayEventTracker } from "@/components/play/play-event-tracker";
import { PlayMetaRail } from "@/components/play/play-meta-rail";
import { PlayStageShell } from "@/components/play/play-stage-shell";
import { Card } from "@/components/ui/card";
import { PREVIEW_GAMES, getPreviewGameById, getPreviewGameBySlug } from "@/lib/demo/preview-data";
import { parseLegacySandboxAllowlist, resolveGameIframeSandboxPolicy } from "@/lib/games/sandbox-policy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type GameRow = Database["public"]["Tables"]["games_metadata"]["Row"];

type GameLookupResult = {
  game: GameRow | null;
  errorMessage: string | null;
  resolvedById: boolean;
};

type ArtifactHealthSignal = {
  level: "ok" | "warn";
  message: string;
};

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getGameBySlug = cache(async (slugOrId: string): Promise<GameLookupResult> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: gameBySlug, error: slugError } = await supabase.from("games_metadata").select("*").eq("slug", slugOrId).maybeSingle();

    if (slugError) {
      return { game: null, errorMessage: slugError.message, resolvedById: false };
    }
    if (gameBySlug) {
      return { game: gameBySlug, errorMessage: null, resolvedById: false };
    }

    if (UUID_LIKE.test(slugOrId)) {
      const { data: gameById, error: idError } = await supabase.from("games_metadata").select("*").eq("id", slugOrId).maybeSingle();
      if (idError) return { game: null, errorMessage: idError.message, resolvedById: false };
      if (gameById) return { game: gameById, errorMessage: null, resolvedById: true };
    }

    return { game: null, errorMessage: null, resolvedById: false };
  } catch (error) {
    return { game: null, errorMessage: error instanceof Error ? error.message : "unknown_error", resolvedById: false };
  }
});

const resolveAiReviewFallback = cache(async (slug: string, aiReview: string | null): Promise<string | null> => {
  const _ = slug;
  return aiReview && aiReview.trim() ? aiReview.trim() : null;
});

const resolveArtifactHealthSignal = cache(async (_game: GameRow): Promise<ArtifactHealthSignal | null> => null);

function resolvePlayFlavor(game: GameRow): "racing" | "flight" | "fps" | "brawler" | "default" {
  const normalized = `${game.name} ${game.slug} ${game.genre}`.toLowerCase();
  if (/(f1|formula|circuit|race|racing|레이싱|그랑프리)/.test(normalized)) return "racing";
  if (/(flight|pilot|비행|항공)/.test(normalized)) return "flight";
  if (/(fps|shooter|총|사격|슈팅)/.test(normalized)) return "fps";
  if (/(fight|brawler|격투|근접|난투|duel)/.test(normalized)) return "brawler";
  return "default";
}

function controlsByGame(game: GameRow): string[] {
  if (Array.isArray(game.controls_guide) && game.controls_guide.length > 0) {
    return game.controls_guide.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  const flavor = resolvePlayFlavor(game);
  if (flavor === "racing") return ["조향: ← / → 또는 A / D", "가속/감속: ↑ / ↓ 또는 W / S · 부스트: Shift", "재시작: R"];
  if (flavor === "flight") return ["자세 제어: W/S 피치 · A/D 롤 · Q/E 요", "속도 제어: ↑/↓ 스로틀 · Shift 부스트", "재시작: R"];
  if (flavor === "fps") return ["이동: W / A / S / D 또는 방향키", "공격: Space 또는 클릭(게임 모드에 따라 다름)", "회피: Shift", "재시작: R"];
  if (flavor === "brawler") return ["이동: W / A / S / D 또는 방향키", "공격: Space", "회피: Shift", "재시작: R"];
  return ["기본 이동: ← / → 또는 A / D", "액션: Space", "재시작: R"];
}

function overviewByGame(game: GameRow): string[] {
  if (Array.isArray(game.play_overview) && game.play_overview.length > 0) {
    return game.play_overview.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  const flavor = resolvePlayFlavor(game);
  const lines: string[] = ["목표를 빠르게 파악하고 즉시 플레이하세요."];
  if (flavor === "racing") return [...lines, "체크포인트를 연속 통과하며 충돌 없이 완주 시간을 단축하세요.", "코너 진입 전 감속하고 탈출 구간에서 재가속하면 안정적으로 기록이 오릅니다."];
  if (flavor === "flight") return [...lines, "링 통과를 이어가며 속도와 기체 안정성을 동시에 유지하세요.", "피치·롤·요를 짧게 분리 조작하면 경로 이탈을 줄일 수 있습니다."];
  if (flavor === "fps") return [...lines, "이동과 공격 리듬을 유지해 생존 시간과 처치 효율을 동시에 올리세요.", "정면에서 버티기보다 측면 이동으로 전장을 관리하면 안정성이 올라갑니다."];
  if (flavor === "brawler") return [...lines, "거리 조절과 회피 타이밍을 맞춰 연속 공격 기회를 만드세요.", "짧은 콤보를 안정적으로 연결하면 점수와 생존율이 함께 올라갑니다."];
  return [...lines, "상단 목표와 조작 안내를 기준으로 핵심 루프를 빠르게 익히세요.", "초반에는 생존 우선으로 운영하고, 익숙해지면 점수 루프를 확장하세요."];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: slugParam } = await params;
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  if (previewMode) {
    const previewGame = getPreviewGameBySlug(slugParam) ?? getPreviewGameById(slugParam) ?? PREVIEW_GAMES[0];
    const ogImage = previewGame.hero_image_url || previewGame.screenshot_url || previewGame.thumbnail_url || undefined;
    const description = previewGame.short_description || previewGame.marketing_summary || previewGame.ai_review || `${previewGame.name} 플레이 페이지입니다. 키보드 조작으로 기록에 도전해보세요.`;
    return {
      title: `${previewGame.name} - IIS Arcade`,
      description,
      openGraph: { title: `${previewGame.name} - IIS Arcade`, description, images: ogImage ? [ogImage] : [], type: "website" },
      twitter: { card: "summary_large_image", title: previewGame.name, description, images: ogImage ? [ogImage] : [] },
    };
  }

  const { game, errorMessage } = await getGameBySlug(slugParam);
  if (errorMessage) return { title: "IIS Arcade" };
  if (!game) return { title: "Game Not Found" };
  const resolvedAiReview = await resolveAiReviewFallback(game.slug, game.ai_review);
  const ogImage = game.hero_image_url || game.screenshot_url || game.thumbnail_url || undefined;
  const defaultDescription = game.short_description || game.marketing_summary || `${game.name} 플레이 페이지입니다. 키보드 조작으로 기록에 도전해보세요.`;

  return {
    title: `${game.name} - IIS Arcade`,
    description: resolvedAiReview || defaultDescription,
    openGraph: { title: `${game.name} - IIS Arcade`, description: resolvedAiReview || defaultDescription, images: ogImage ? [ogImage] : [], type: "website" },
    twitter: { card: "summary_large_image", title: game.name, description: resolvedAiReview || defaultDescription, images: ogImage ? [ogImage] : [] },
  };
}

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: slugParam } = await params;
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  if (previewMode) {
    const previewGame = getPreviewGameBySlug(slugParam) ?? getPreviewGameById(slugParam) ?? PREVIEW_GAMES[0];
    return renderPlayPage(previewGame, true);
  }

  const { game, errorMessage, resolvedById } = await getGameBySlug(slugParam);
  if (errorMessage) {
    return (
      <Card className="rounded-[1.8rem] border-white/8 bg-[#111118]/86 p-6 text-sm text-muted-foreground">
        <h1 className="font-display text-3xl text-foreground">게임 플레이</h1>
        <p className="mt-3">Supabase 구성이 올바르지 않아 게임 데이터를 불러오지 못했습니다.</p>
        <p className="mt-2 text-red-100">{errorMessage}</p>
      </Card>
    );
  }
  if (!game) notFound();
  if (resolvedById && game.slug !== slugParam) redirect(`/play/${game.slug}`);
  return renderPlayPage(game, false);
}

async function renderPlayPage(typedGame: GameRow, previewMode: boolean) {
  const legacyGameSandboxMode = process.env.LEGACY_GAME_SANDBOX === "1";
  const legacySandboxAllowlist = parseLegacySandboxAllowlist(process.env.LEGACY_GAME_SANDBOX_ALLOWLIST);
  const iframeSandboxPolicy = resolveGameIframeSandboxPolicy({ legacySandboxMode: legacyGameSandboxMode, gameId: typedGame.id, gameSlug: typedGame.slug, legacyAllowlist: legacySandboxAllowlist });
  const proxiedArtifactUrl = `/api/games/${typedGame.id}/artifact/index.html`;
  const debugMode = process.env.NEXT_PUBLIC_GAME_EMBED_DEBUG === "1";
  const artifactSignal = previewMode ? null : await resolveArtifactHealthSignal(typedGame);
  const controls = controlsByGame(typedGame);
  const overview = overviewByGame(typedGame);

  return (
    <section className="grid gap-5">
      {previewMode ? (
        <Card className="rounded-[1.7rem] border-white/8 bg-[#111118]/82 px-5 py-4 text-sm text-muted-foreground">
          <p>프리뷰 모드 · 실서버 연결 없이 샘플 게임 데이터로 화면을 렌더링합니다.</p>
        </Card>
      ) : null}

      <PlayHeader
        title={typedGame.name}
        summary={typedGame.short_description?.trim() || typedGame.marketing_summary?.trim() || typedGame.ai_review?.trim() || "바로 플레이하고 목표를 달성하세요."}
        detailHref={`/games/${typedGame.slug}`}
        debugHref={debugMode ? proxiedArtifactUrl : null}
      />
      {!previewMode ? <PlayEventTracker slug={typedGame.slug} /> : null}

      <PlayStageShell
        stage={
          <Card className="rounded-[1.9rem] border-white/8 bg-[#111118]/88 p-4 sm:p-5">
            {artifactSignal?.level === "warn" ? <p className="mb-4 rounded-2xl border border-amber-300/15 bg-amber-300/8 px-4 py-3 text-sm text-amber-100">⚠ {artifactSignal.message}</p> : null}
            {previewMode ? (
              <div className="play-frame-wrap relative aspect-video w-full overflow-hidden rounded-[1.8rem] border border-white/8 bg-black shadow-[var(--shadow-panel)]">
                {typedGame.screenshot_url ? <Image src={typedGame.screenshot_url} alt={`${typedGame.name} preview`} fill sizes="(max-width: 1280px) 100vw, 70vw" className="object-cover" /> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <h3 className="font-display text-3xl tracking-[-0.04em]">{typedGame.name}</h3>
                  <p className="mt-2 max-w-xl text-sm text-white/78">프리뷰 모드: 실게임 iframe 대신 대표 스크린샷을 노출합니다.</p>
                </div>
              </div>
            ) : (
              <PlayEmbedFrame src={proxiedArtifactUrl} title={typedGame.name} sandbox={iframeSandboxPolicy} />
            )}
          </Card>
        }
        rail={<PlayMetaRail previewMode={previewMode} artifactMessage={artifactSignal?.message ?? null} controls={controls} overview={overview} />}
      />

      <PlayInfoTabs controlsHint={controls} overview={overview} />
    </section>
  );
}
