// 공개 플레이 화면입니다.
// 슬러그 조회, 프리뷰 모드, iframe 보안 정책을 한 파일에서 정리해
// 실제 게임 실행 경로가 흔들리지 않게 합니다.

import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { PlayEmbedFrame } from "@/components/PlayEmbedFrame";
import { PlayEventTracker } from "@/components/play/play-event-tracker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PREVIEW_GAMES, getPreviewGameById, getPreviewGameBySlug } from "@/lib/demo/preview-data";
import { resolveGameControls, resolveGameImage, resolveGameOverview, resolveGameSummary } from "@/lib/games/presentation";
import { parseLegacySandboxAllowlist, resolveGameIframeSandboxPolicy } from "@/lib/games/sandbox-policy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type GameRow = Database["public"]["Tables"]["games_metadata"]["Row"];

type GameLookupResult = {
  game: GameRow | null;
  errorMessage: string | null;
  resolvedById: boolean;
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

function controlsByGame(game: GameRow): string[] {
  return resolveGameControls(game);
}

function overviewByGame(game: GameRow): string[] {
  return resolveGameOverview(game);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  const previewGame = previewMode ? getPreviewGameBySlug(slug) ?? getPreviewGameById(slug) ?? PREVIEW_GAMES[0] : null;
  const serverGame = previewMode ? null : (await getGameBySlug(slug)).game;
  const game = previewGame ?? serverGame;

  if (!game) {
    return { title: "iis" };
  }

  const description = resolveGameSummary(game);
  const image = resolveGameImage(game) ?? undefined;
  return {
    title: `${game.name} | iis`,
    description,
    openGraph: {
      title: `${game.name} | iis`,
      description,
      images: image ? [image] : [],
      type: "website",
    },
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
      <Card className="p-6 text-sm text-muted-foreground">
        <h1 className="text-3xl font-semibold text-foreground">게임 플레이</h1>
        <p className="mt-3">게임 데이터를 불러오지 못했습니다.</p>
        <p className="mt-2 text-red-600">{errorMessage}</p>
      </Card>
    );
  }
  if (!game) notFound();
  if (resolvedById && game.slug !== slugParam) redirect(`/play/${game.slug}`);
  return renderPlayPage(game, false);
}

async function renderPlayPage(game: GameRow, previewMode: boolean) {
  const legacyGameSandboxMode = process.env.LEGACY_GAME_SANDBOX === "1";
  const legacySandboxAllowlist = parseLegacySandboxAllowlist(process.env.LEGACY_GAME_SANDBOX_ALLOWLIST);
  const iframeSandboxPolicy = resolveGameIframeSandboxPolicy({
    legacySandboxMode: legacyGameSandboxMode,
    gameId: game.id,
    gameSlug: game.slug,
    legacyAllowlist: legacySandboxAllowlist,
  });
  const proxiedArtifactUrl = `/api/games/${game.id}/artifact/index.html`;
  const controls = controlsByGame(game);
  const overview = overviewByGame(game);
  const summary = resolveGameSummary(game);
  const coverImage = resolveGameImage(game);

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-foreground">{game.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{summary}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/">홈으로</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/create">게임 만들기</Link>
          </Button>
        </div>
      </div>

      {!previewMode ? <PlayEventTracker slug={game.slug} /> : null}

      <div className="overflow-hidden rounded-[2rem] border border-[#1b1337]/12 bg-[#050816] shadow-[0_24px_60px_rgba(9,12,33,0.22)]">
        {previewMode ? (
          <div className="play-frame-wrap relative aspect-video w-full overflow-hidden bg-[#050816]">
            {coverImage ? (
              <Image src={coverImage} alt={`${game.name} preview`} fill sizes="(max-width: 1280px) 100vw, 70vw" className="object-cover" />
            ) : null}
          </div>
        ) : (
          <PlayEmbedFrame src={proxiedArtifactUrl} title={game.name} sandbox={iframeSandboxPolicy} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-foreground">게임 소개</h2>
          <ul className="mt-4 grid gap-2 text-sm leading-7 text-muted-foreground">
            {overview.map((line, index) => (
              <li key={`overview-${index}-${line}`}>{line}</li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-foreground">조작법</h2>
          <ul className="mt-4 grid gap-2 text-sm leading-7 text-muted-foreground">
            {controls.map((line, index) => (
              <li key={`control-${index}-${line}`}>{line}</li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
