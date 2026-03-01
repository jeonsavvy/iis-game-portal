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
type SimilarGame = Pick<GameRow, "id" | "name" | "thumbnail_url" | "screenshot_url">;

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

function getPreviewSimilarGames(gameId: string): SimilarGame[] {
  return PREVIEW_GAMES.filter((game) => game.id !== gameId).slice(0, 4).map((game) => ({
    id: game.id,
    name: game.name,
    thumbnail_url: game.thumbnail_url,
    screenshot_url: game.screenshot_url,
  }));
}

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
    .eq("stage", "echo")
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
      "← / → 조향 / ↑ 가속 / ↓ 브레이크 / Shift 오버테이크 부스트",
      "코너 진입 전 브레이크로 속도를 정리하면 충돌이 크게 줄어듭니다.",
      "체크포인트를 연속 통과하며 랩 타임을 줄이세요.",
    ];
  }

  if (/(flight|pilot|비행|항공)/.test(normalized)) {
    return [
      "W/S 피치 · A/D 롤 · Q/E 요 · ↑/↓ 스로틀 · Shift 부스트",
      "링 통과를 우선하고, 급격한 요/롤 입력은 짧게 끊어 주세요.",
      "위험 구역에서는 속도보다 기체 안정성이 먼저입니다.",
    ];
  }

  return [
    "← / → 또는 A / D: 좌우 이동",
    "↑ / W 또는 Space: 점프/부스트",
    "게임 화면 클릭 후 키 입력이 반응합니다. 포커스를 먼저 맞춰주세요.",
  ];
}

function overviewByGame(game: GameRow): string[] {
  const lines: string[] = [];
  lines.push(`${game.name}은(는) 즉시 플레이 중심의 짧은 세션 게임입니다.`);
  lines.push("짧은 세션에서도 피드백이 즉시 오도록 설계되어, 반복 플레이를 통해 기록을 갱신하는 구조를 지향합니다.");
  lines.push("플레이 중 체감 난이도가 급격히 올라가면 조작 입력 리듬을 먼저 안정화한 뒤 점수 루프를 확장하세요.");
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
    return renderPlayPage(previewGame, getPreviewSimilarGames(previewGame.id), previewGame.ai_review, true);
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

  const supabase = await createSupabaseServerClient();
  const resolvedAiReview = await resolveAiReviewFallback(game.slug, game.ai_review);

  const { data: similarRows } = await supabase
    .from("games_metadata")
    .select("id,name,thumbnail_url,screenshot_url")
    .neq("id", game.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(6);

  const similarGames = (similarRows ?? []) as SimilarGame[];

  return renderPlayPage(game, similarGames, resolvedAiReview, false);
}

function renderPlayPage(
  typedGame: GameRow,
  similarGames: SimilarGame[],
  resolvedAiReview: string | null,
  previewMode: boolean,
) {
  const legacyGameSandboxMode = process.env.LEGACY_GAME_SANDBOX === "1";
  const legacySandboxAllowlist = parseLegacySandboxAllowlist(process.env.LEGACY_GAME_SANDBOX_ALLOWLIST);
  const iframeSandboxPolicy = resolveGameIframeSandboxPolicy({
    legacySandboxMode: legacyGameSandboxMode,
    gameId: typedGame.id,
    gameSlug: typedGame.slug,
    legacyAllowlist: legacySandboxAllowlist,
  });
  const proxiedArtifactUrl = `/api/games/${typedGame.id}/artifact/index.html`;
  const createdAt = new Date(typedGame.created_at).toLocaleString("ko-KR");
  const updatedAt = new Date(typedGame.updated_at).toLocaleString("ko-KR");

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
          <p className="section-subtitle">
            생성 {createdAt} · 업데이트 {updatedAt}
          </p>
        </div>
        <div className="play-redesign-actions">
          <Link className="button button-ghost" href="/">
            아케이드 홈
          </Link>
          <a className="button button-primary" href={proxiedArtifactUrl} target="_blank" rel="noopener noreferrer">
            새 탭에서 실행
          </a>
        </div>
      </header>

      <section className="play-first-screen">
        <article className="surface play-primary-stage">
          <div className="play-stage-top">
            <span className={`status-chip ${typedGame.status === "active" ? "tone-success" : "tone-warn"}`}>
              {typedGame.status === "active" ? "PLAY READY" : typedGame.status.toUpperCase()}
            </span>
            <span className="muted-text">{typedGame.slug}</span>
          </div>
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

        <aside className="surface play-quick-meta">
          <h3 className="section-title">핵심 정보</h3>
          <dl>
            <div>
              <dt>상태</dt>
              <dd>{typedGame.status}</dd>
            </div>
            <div>
              <dt>슬러그</dt>
              <dd>{typedGame.slug}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <PlayInfoTabs
        gameName={typedGame.name}
        aiReview={resolvedAiReview}
        screenshotUrl={typedGame.screenshot_url}
        controlsHint={controlsByGame(typedGame)}
        overview={overviewByGame(typedGame)}
        similarGames={similarGames}
      />
    </section>
  );
}
