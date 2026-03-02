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
      "가속·감속: ↑ / ↓ 또는 W / S · 부스트: Shift",
      "운영 팁: 코너 직전 감속 → 에이펙스에서 재가속하면 안정적으로 랩을 이어갈 수 있습니다.",
      "시작 문제: 화면을 한 번 클릭한 뒤 조작하면 키 입력이 더 안정적으로 반응합니다.",
    ];
  }

  if (/(flight|pilot|비행|항공)/.test(normalized)) {
    return [
      "자세 제어: W/S 피치 · A/D 롤 · Q/E 요",
      "속도 제어: ↑/↓ 스로틀 · Shift 부스트",
      "운영 팁: 급격한 롤·요 입력은 짧게 끊어 기체 흔들림을 줄이세요.",
      "링 통과 우선: 위험 구역에서는 속도보다 안정성을 먼저 확보하세요.",
    ];
  }

  if (/(fps|shooter|총|사격|슈팅)/.test(normalized)) {
    return [
      "이동: W / A / S / D 또는 방향키",
      "조준·사격: 마우스 이동 + 클릭(지원 모드 기준) 또는 Space",
      "회피: Shift 대시(지원 모드 기준)",
      "운영 팁: 정면 교전보다 좌우 이동으로 탄선을 비우며 교전하세요.",
    ];
  }

  return [
    "기본 이동: ← / → 또는 A / D",
    "액션: ↑ / W 또는 Space",
    "운영 팁: 위험 요소는 정면 대응보다 위치 선점으로 먼저 피하세요.",
    "시작 문제: 화면을 한 번 클릭한 뒤 조작하면 입력 반응이 안정적입니다.",
  ];
}

function overviewByGame(game: GameRow): string[] {
  const normalized = `${game.name} ${game.slug}`.toLowerCase();
  const lines: string[] = [];
  lines.push(`${game.name} 플레이 준비가 완료되었습니다.`);

  if (/(f1|formula|circuit|race|racing|레이싱|그랑프리)/.test(normalized)) {
    lines.push("핵심 목표는 충돌을 줄이며 체크포인트를 연속 통과해 랩 흐름을 유지하는 것입니다.");
    lines.push("브레이크-턴인-재가속 리듬을 만들면 점수와 생존을 동시에 끌어올릴 수 있습니다.");
    lines.push("부스트는 직선 구간에서 사용하고, 코너 진입 전에는 속도를 정리해 안정적으로 이어가세요.");
    return lines;
  }

  if (/(flight|pilot|비행|항공)/.test(normalized)) {
    lines.push("핵심 목표는 링 통과를 이어가며 기체 안정성을 유지하는 것입니다.");
    lines.push("피치·롤·요를 동시에 크게 쓰기보다 한 축씩 분리해 조작하면 실수를 줄일 수 있습니다.");
    lines.push("고속 구간에서는 짧은 입력으로 자세를 미세 보정해 흔들림을 최소화하세요.");
    return lines;
  }

  if (/(fps|shooter|총|사격|슈팅)/.test(normalized)) {
    lines.push("핵심 목표는 적의 압박을 회피하며 교전 효율을 높여 생존 시간을 늘리는 것입니다.");
    lines.push("엄폐 없이 정면에서 오래 싸우기보다, 이동-사격 리듬으로 탄선 관리에 집중하세요.");
    lines.push("난이도가 오르면 한 번에 많은 처치보다 안정적인 위치 유지가 더 중요합니다.");
    return lines;
  }

  lines.push("요청한 콘셉트에 맞는 목표와 조작을 먼저 익힌 뒤, 점진적으로 난도를 올려 플레이하세요.");
  lines.push("처음에는 안정적인 패턴 파악에 집중하고, 익숙해지면 공격적인 플레이로 점수를 확장하세요.");
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
          <p className="section-subtitle">게임을 시작하고 조작법에 맞춰 목표를 달성해보세요.</p>
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
        gameName={typedGame.name}
        screenshotUrl={typedGame.screenshot_url}
        controlsHint={controlsByGame(typedGame)}
        overview={overviewByGame(typedGame)}
      />
    </section>
  );
}
