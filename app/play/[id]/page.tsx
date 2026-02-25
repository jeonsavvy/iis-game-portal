import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayInfoTabs } from "@/components/PlayInfoTabs";
import { PREVIEW_GAMES, getPreviewGameById } from "@/lib/demo/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type GameRow = Database["public"]["Tables"]["games_metadata"]["Row"];

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

async function resolveAiReviewFallback(game: GameRow): Promise<string | null> {
  if (game.ai_review && game.ai_review.trim()) {
    return game.ai_review.trim();
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
    const review = pickReviewFromMetadata(log.metadata, game.slug);
    if (review) return review;
  }
  return null;
}

function controlsByGenre(genre: string): string[] {
  const normalized = genre.toLowerCase();

  if (normalized.includes("puzzle")) {
    return ["마우스/터치로 오브젝트를 선택하고 배치하세요.", "힌트가 막히면 재시도보다 단서 순서를 먼저 확인하세요.", "타이머가 있는 퍼즐은 초기 10초에 맵 구조를 파악하세요."];
  }

  if (normalized.includes("survival")) {
    return ["WASD/방향키로 이동하며 위험 지대를 피하세요.", "초반에는 공격보다 생존 루트를 먼저 확보하세요.", "아이템 사용 타이밍이 점수보다 생존 시간에 더 큰 영향을 줍니다."];
  }

  return [
    "← / → 또는 A / D: 좌우 이동",
    "↑ / W 또는 Space: 점프/부스트",
    "게임 화면 클릭 후 키 입력이 반응합니다. 포커스를 먼저 맞춰주세요.",
  ];
}

function overviewByGame(game: GameRow): string[] {
  const lines: string[] = [];
  lines.push(`${game.name}은(는) ${game.genre} 장르 기반의 즉시 플레이형 프로젝트입니다.`);
  lines.push("짧은 세션에서도 피드백이 즉시 오도록 설계되어, 반복 플레이를 통해 기록을 갱신하는 구조를 지향합니다.");
  lines.push("플레이 중 체감 난이도가 급격히 올라가면 조작 입력 리듬을 먼저 안정화한 뒤 점수 루프를 확장하세요.");
  return lines;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { title: "IIS Arcade" };
  }

  const { data: game } = await supabase.from("games_metadata").select("*").eq("id", id).single();

  if (!game) {
    if (previewMode) {
      const previewGame = getPreviewGameById(id) ?? PREVIEW_GAMES[0];
      return { title: `${previewGame.name} - IIS Arcade` };
    }
    return { title: "Game Not Found" };
  }
  const typedGame = game as unknown as GameRow;
  const resolvedAiReview = await resolveAiReviewFallback(typedGame);

  const ogImage = typedGame.screenshot_url || typedGame.thumbnail_url || undefined;
  const defaultDescription = `${typedGame.name} 플레이 페이지입니다. 키보드 조작으로 기록에 도전해보세요.`;

  return {
    title: `${typedGame.name} - IIS Arcade`,
    description: resolvedAiReview || defaultDescription,
    openGraph: {
      title: `${typedGame.name} - IIS Arcade`,
      description: resolvedAiReview || defaultDescription,
      images: ogImage ? [ogImage] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: typedGame.name,
      description: resolvedAiReview || defaultDescription,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    if (!previewMode) {
      return (
        <section className="card" style={{ display: "grid", gap: 8 }}>
          <h1 style={{ margin: 0 }}>게임 플레이</h1>
          <p style={{ margin: 0 }}>Supabase 구성이 올바르지 않아 게임 데이터를 불러오지 못했습니다.</p>
          <p style={{ margin: 0, color: "var(--muted)" }}>{error instanceof Error ? error.message : "unknown_error"}</p>
        </section>
      );
    }

    const previewGame = getPreviewGameById(id) ?? PREVIEW_GAMES[0];
    const previewSimilar = PREVIEW_GAMES.filter((game) => game.id !== previewGame.id).slice(0, 4).map((game) => ({
      id: game.id,
      name: game.name,
      genre: game.genre,
      thumbnail_url: game.thumbnail_url,
      screenshot_url: game.screenshot_url,
    }));

    return renderPlayPage(previewGame, previewSimilar, previewGame.ai_review, true);
  }

  const { data: game } = await supabase.from("games_metadata").select("*").eq("id", id).single();
  if (!game) {
    if (previewMode) {
      const previewGame = getPreviewGameById(id) ?? PREVIEW_GAMES[0];
      const previewSimilar = PREVIEW_GAMES.filter((item) => item.id !== previewGame.id).slice(0, 4).map((item) => ({
        id: item.id,
        name: item.name,
        genre: item.genre,
        thumbnail_url: item.thumbnail_url,
        screenshot_url: item.screenshot_url,
      }));
      return renderPlayPage(previewGame, previewSimilar, previewGame.ai_review, true);
    }
    notFound();
  }

  const typedGame = game as unknown as GameRow;
  const resolvedAiReview = await resolveAiReviewFallback(typedGame);

  const { data: similarRows } = await supabase
    .from("games_metadata")
    .select("id,name,genre,thumbnail_url,screenshot_url")
    .eq("genre", typedGame.genre)
    .neq("id", typedGame.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(6);

  const similarGames = (similarRows ?? []) as Array<Pick<GameRow, "id" | "name" | "genre" | "thumbnail_url" | "screenshot_url">>;

  return renderPlayPage(typedGame, similarGames, resolvedAiReview, false);
}

function renderPlayPage(
  typedGame: GameRow,
  similarGames: Array<Pick<GameRow, "id" | "name" | "genre" | "thumbnail_url" | "screenshot_url">>,
  resolvedAiReview: string | null,
  previewMode: boolean,
) {
  const legacyGameSandboxMode = process.env.LEGACY_GAME_SANDBOX === "1";
  const iframeSandboxPolicy = legacyGameSandboxMode
    ? "allow-scripts allow-same-origin allow-forms"
    : "allow-scripts";
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
            {typedGame.genre} · 생성 {createdAt} · 업데이트 {updatedAt}
          </p>
        </div>
        <div className="play-redesign-actions">
          <Link className="button button-ghost" href="/">
            아케이드 홈
          </Link>
          <a className="button button-primary" href={proxiedArtifactUrl} target="_blank" rel="noreferrer">
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
              <iframe
                src={proxiedArtifactUrl}
                title={typedGame.name}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                sandbox={iframeSandboxPolicy}
              />
            )}
          </div>
        </article>

        <aside className="surface play-quick-meta">
          <h3 className="section-title">핵심 메타</h3>
          <dl>
            <div>
              <dt>장르</dt>
              <dd>{typedGame.genre}</dd>
            </div>
            <div>
              <dt>상태</dt>
              <dd>{typedGame.status}</dd>
            </div>
            <div>
              <dt>슬러그</dt>
              <dd>{typedGame.slug}</dd>
            </div>
            {typedGame.url ? (
              <div>
                <dt>원본</dt>
                <dd>
                  <a className="inline-link" href={typedGame.url} target="_blank" rel="noreferrer">
                    스토리지 링크
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </section>

      <PlayInfoTabs
        gameName={typedGame.name}
        genre={typedGame.genre}
        aiReview={resolvedAiReview}
        screenshotUrl={typedGame.screenshot_url}
        controlsHint={controlsByGenre(typedGame.genre)}
        overview={overviewByGame(typedGame)}
        similarGames={similarGames}
      />
    </section>
  );
}
