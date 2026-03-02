import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PlayEmbedFrame } from "@/components/PlayEmbedFrame";
import { PlayInfoTabs } from "@/components/PlayInfoTabs";
import { PREVIEW_GAMES, getPreviewGameById } from "@/lib/demo/preview-data";
import { parseLegacySandboxAllowlist, resolveGameIframeSandboxPolicy } from "@/lib/games/sandbox-policy";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type GameRow = Database["public"]["Tables"]["games_metadata"]["Row"];

type GameLookupResult = {
  game: GameRow | null;
  errorMessage: string | null;
};

const getGameById = cache(async (id: string): Promise<GameLookupResult> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: game, error } = await supabase.from("games_metadata").select("*").eq("id", id).maybeSingle();
    if (error || !game) {
      return { game: null, errorMessage: null };
    }
    return { game, errorMessage: null };
  } catch (error) {
    return {
      game: null,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    };
  }
});

function pickReviewFromMetadata(metadata: unknown, slug: string): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const row = metadata as Record<string, unknown>;
  const metadataSlug = row.slug;
  const metadataReview = row.ai_review_text;
  if (typeof metadataSlug !== "string" || metadataSlug !== slug) return null;
  if (typeof metadataReview !== "string") return null;
  const normalized = metadataReview.trim();
  return normalized || null;
}

const resolveAiReviewFallback = cache(async (slug: string, aiReview: string | null): Promise<string | null> => {
  if (aiReview && aiReview.trim()) {
    return aiReview.trim();
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    return null;
  }

  const { data: logs } = await adminClient
    .from("pipeline_logs")
    .select("metadata,created_at")
    .eq("stage", "report")
    .order("created_at", { ascending: false })
    .limit(120);

  const typedLogs = (logs ?? []) as Array<Pick<Database["public"]["Tables"]["pipeline_logs"]["Row"], "metadata" | "created_at">>;
  if (typedLogs.length === 0) return null;

  for (const log of typedLogs) {
    const review = pickReviewFromMetadata(log.metadata, slug);
    if (review) return review;
  }
  return null;
});

function controlsByGame(game: GameRow): string[] {
  const normalized = `${game.name} ${game.slug}`.toLowerCase();

  if (/(f1|formula|circuit|race|racing|레이싱|그랑프리)/.test(normalized)) {
    return [
      "조향: ← / → 또는 A / D",
      "가속/감속: ↑ / ↓ 또는 W / S · 부스트: Shift",
      "핵심: 코너 진입 전 감속하고 탈출 구간에서 재가속",
      "재시작: R",
    ];
  }

  if (/(flight|pilot|비행|항공)/.test(normalized)) {
    return [
      "자세 제어: W/S 피치 · A/D 롤 · Q/E 요",
      "속도 제어: ↑/↓ 스로틀 · Shift 부스트",
      "핵심: 큰 조작보다 짧은 미세 보정",
      "재시작: R",
    ];
  }

  if (/(fps|shooter|총|사격|슈팅)/.test(normalized)) {
    return [
      "이동: W / A / S / D 또는 방향키",
      "공격: Space 또는 클릭(게임 모드에 따라 다름)",
      "회피: Shift",
      "재시작: R",
    ];
  }

  return [
    "기본 이동: ← / → 또는 A / D",
    "액션: ↑ / W 또는 Space",
    "핵심: 위험 구간은 먼저 위치를 확보",
    "재시작: R",
  ];
}

function overviewByGame(game: GameRow): string[] {
  const normalized = `${game.name} ${game.slug}`.toLowerCase();
  const lines: string[] = [];
  lines.push(`${game.name}의 목표를 빠르게 파악하고 즉시 플레이하세요.`);

  if (/(f1|formula|circuit|race|racing|레이싱|그랑프리)/.test(normalized)) {
    lines.push("체크포인트를 연속 통과해 랩 흐름을 유지하면 점수가 급격히 상승합니다.");
    lines.push("브레이크-턴인-재가속 리듬을 만들수록 안정성과 속도가 함께 올라갑니다.");
    return lines;
  }

  if (/(flight|pilot|비행|항공)/.test(normalized)) {
    lines.push("링 통과를 이어가며 속도와 기체 안정성을 동시에 유지하는 것이 핵심입니다.");
    lines.push("피치·롤·요를 분리해 조작하면 실수를 줄이고 누적 점수를 지키기 쉽습니다.");
    return lines;
  }

  if (/(fps|shooter|총|사격|슈팅)/.test(normalized)) {
    lines.push("이동과 공격 리듬을 유지해 생존 시간과 처치 효율을 동시에 올리세요.");
    lines.push("정면에서 버티기보다 측면 이동으로 전장을 관리하면 안정성이 올라갑니다.");
    return lines;
  }

  lines.push("핵심 조작을 먼저 익힌 뒤 난도를 올리면 완주율과 점수가 함께 올라갑니다.");
  lines.push("초반에는 생존 중심, 익숙해지면 공격적인 루프로 전환하세요.");
  return lines;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  if (previewMode) {
    const previewGame = getPreviewGameById(id) ?? PREVIEW_GAMES[0];
    const ogImage = previewGame.screenshot_url || previewGame.thumbnail_url || undefined;
    const description = previewGame.ai_review || `${previewGame.name} 플레이 페이지입니다. 키보드 조작으로 기록에 도전해보세요.`;
    return {
      title: `${previewGame.name} - IIS Arcade`,
      description,
      openGraph: {
        title: `${previewGame.name} - IIS Arcade`,
        description,
        images: ogImage ? [ogImage] : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: previewGame.name,
        description,
        images: ogImage ? [ogImage] : [],
      },
    };
  }

  const { game, errorMessage } = await getGameById(id);

  if (errorMessage) {
    return { title: "IIS Arcade" };
  }
  if (!game) {
    return { title: "Game Not Found" };
  }
  const resolvedAiReview = await resolveAiReviewFallback(game.slug, game.ai_review);

  const ogImage = game.screenshot_url || game.thumbnail_url || undefined;
  const defaultDescription = `${game.name} 플레이 페이지입니다. 키보드 조작으로 기록에 도전해보세요.`;

  return {
    title: `${game.name} - IIS Arcade`,
    description: resolvedAiReview || defaultDescription,
    openGraph: {
      title: `${game.name} - IIS Arcade`,
      description: resolvedAiReview || defaultDescription,
      images: ogImage ? [ogImage] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: game.name,
      description: resolvedAiReview || defaultDescription,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  if (previewMode) {
    const previewGame = getPreviewGameById(id) ?? PREVIEW_GAMES[0];
    return renderPlayPage(previewGame, true);
  }

  const { game, errorMessage } = await getGameById(id);

  if (errorMessage) {
    return (
      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>게임 플레이</h1>
        <p style={{ margin: 0 }}>Supabase 구성이 올바르지 않아 게임 데이터를 불러오지 못했습니다.</p>
        <p style={{ margin: 0, color: "var(--muted)" }}>{errorMessage}</p>
      </section>
    );
  }

  if (!game) {
    notFound();
  }

  return renderPlayPage(game, false);
}

function renderPlayPage(typedGame: GameRow, previewMode: boolean) {
  const legacyGameSandboxMode = process.env.LEGACY_GAME_SANDBOX === "1";
  const legacySandboxAllowlist = parseLegacySandboxAllowlist(process.env.LEGACY_GAME_SANDBOX_ALLOWLIST);
  const iframeSandboxPolicy = resolveGameIframeSandboxPolicy({
    legacySandboxMode: legacyGameSandboxMode,
    gameId: typedGame.id,
    gameSlug: typedGame.slug,
    legacyAllowlist: legacySandboxAllowlist,
  });
  const proxiedArtifactUrl = `/api/games/${typedGame.id}/artifact/index.html`;
  const debugMode = process.env.NEXT_PUBLIC_GAME_EMBED_DEBUG === "1";

  return (
    <section className="play-redesign-page">
      {previewMode ? (
        <section className="surface play-preview-notice">
          <p>
            프리뷰 모드 · 실서버 연결 없이 샘플 게임 데이터로 화면을 렌더링합니다.
          </p>
        </section>
      ) : null}

      <header className="play-redesign-header">
        <div>
          <p className="eyebrow">게임 플레이</p>
          <h1 className="hero-title">{typedGame.name}</h1>
          <p className="section-subtitle">바로 플레이하고 목표를 달성하세요.</p>
        </div>
        <div className="play-redesign-actions">
          <Link className="button button-ghost" href="/">홈으로</Link>
          {debugMode ? (
            <a className="button button-primary" href={proxiedArtifactUrl} target="_blank" rel="noopener noreferrer">
              디버그: 새 탭 실행
            </a>
          ) : null}
        </div>
      </header>

      <section className="play-first-screen">
        <article className="surface play-primary-stage">
          <div className="play-frame-wrap">
            {previewMode ? (
              <div className="play-preview-stage">
                {typedGame.screenshot_url ? (
                  <Image src={typedGame.screenshot_url} alt={`${typedGame.name} preview`} fill sizes="(max-width: 1024px) 100vw, 70vw" />
                ) : null}
                <div className="play-preview-overlay">
                  <h3>{typedGame.name}</h3>
                  <p>프리뷰 모드: 실게임 iframe 대신 대표 스크린샷을 노출합니다.</p>
                </div>
              </div>
            ) : (
              <PlayEmbedFrame src={proxiedArtifactUrl} title={typedGame.name} sandbox={iframeSandboxPolicy} />
            )}
          </div>
        </article>
      </section>

      <PlayInfoTabs
        controlsHint={controlsByGame(typedGame)}
        overview={overviewByGame(typedGame)}
      />
    </section>
  );
}
