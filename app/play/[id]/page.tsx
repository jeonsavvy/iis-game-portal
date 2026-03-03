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

type ArtifactHealthSignal = {
  level: "ok" | "warn";
  message: string;
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

function matchesLogTarget(metadata: unknown, slug: string, gameId: string): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const row = metadata as Record<string, unknown>;
  const gameSlug = typeof row.game_slug === "string" ? row.game_slug : null;
  if (gameSlug && gameSlug === slug) return true;
  const artifactPath = typeof row.artifact === "string" ? row.artifact : null;
  if (artifactPath && artifactPath.includes(`/games/${slug}/`)) return true;
  const pipelineId = typeof row.pipeline_id === "string" ? row.pipeline_id : null;
  if (pipelineId && pipelineId === gameId) return true;
  return false;
}

function resolveArtifactSignalFromMetadata(metadata: unknown): ArtifactHealthSignal | null {
  if (!metadata || typeof metadata !== "object") return null;
  const row = metadata as Record<string, unknown>;
  const selfcheckResult = row.selfcheck_result;
  if (selfcheckResult && typeof selfcheckResult === "object") {
    const selfcheck = selfcheckResult as Record<string, unknown>;
    if (selfcheck.passed === false) {
      return {
        level: "warn",
        message: "생성 코어 자체검증 실패 아티팩트입니다. 재생성을 권장합니다.",
      };
    }
  }

  if (row.rqc_passed === false) {
    return {
      level: "warn",
      message: "RQC-1 계약 미충족 아티팩트입니다. 품질 보장을 위해 재생성하세요.",
    };
  }

  const playabilityPassed = row.playability_passed;
  if (playabilityPassed === false) {
    return {
      level: "warn",
      message: "플레이 가능성 검증 경고가 감지되었습니다. 운영실에서 재시도를 권장합니다.",
    };
  }

  if (row.final_smoke_ok === false) {
    return {
      level: "warn",
      message: "런타임 스모크 실패 기록이 있어 실행 안정성이 보장되지 않습니다.",
    };
  }

  return null;
}

const resolveArtifactHealthSignal = cache(async (game: GameRow): Promise<ArtifactHealthSignal | null> => {
  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    return null;
  }
  const { data: logs } = await adminClient
    .from("pipeline_logs")
    .select("stage,status,metadata,created_at")
    .in("stage", ["build", "report"])
    .order("created_at", { ascending: false })
    .limit(160);
  const rows = Array.isArray(logs) ? logs : [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const entry = row as Record<string, unknown>;
    if (!matchesLogTarget(entry.metadata, game.slug, game.id)) continue;
    const signal = resolveArtifactSignalFromMetadata(entry.metadata);
    if (signal) return signal;
    if (entry.status === "error") {
      return {
        level: "warn",
        message: "최근 생성 로그에서 오류가 감지되었습니다. 운영실에서 상태를 확인하세요.",
      };
    }
  }
  return null;
});

function resolvePlayFlavor(game: GameRow): "racing" | "flight" | "fps" | "brawler" | "default" {
  const normalized = `${game.name} ${game.slug} ${game.genre}`.toLowerCase();

  if (/(f1|formula|circuit|race|racing|레이싱|그랑프리)/.test(normalized)) {
    return "racing";
  }

  if (/(flight|pilot|비행|항공)/.test(normalized)) {
    return "flight";
  }

  if (/(fps|shooter|총|사격|슈팅)/.test(normalized)) {
    return "fps";
  }

  if (/(fight|brawler|격투|근접|난투|duel)/.test(normalized)) {
    return "brawler";
  }

  return "default";
}

function controlsByGame(game: GameRow): string[] {
  const flavor = resolvePlayFlavor(game);
  if (flavor === "racing") {
    return [
      "조향: ← / → 또는 A / D",
      "가속/감속: ↑ / ↓ 또는 W / S · 부스트: Shift",
      "재시작: R",
    ];
  }
  if (flavor === "flight") {
    return [
      "자세 제어: W/S 피치 · A/D 롤 · Q/E 요",
      "속도 제어: ↑/↓ 스로틀 · Shift 부스트",
      "재시작: R",
    ];
  }
  if (flavor === "fps") {
    return [
      "이동: W / A / S / D 또는 방향키",
      "공격: Space 또는 클릭(게임 모드에 따라 다름)",
      "회피: Shift",
      "재시작: R",
    ];
  }
  if (flavor === "brawler") {
    return [
      "이동: W / A / S / D 또는 방향키",
      "공격: Space",
      "회피: Shift",
      "재시작: R",
    ];
  }
  return [
    "기본 이동: ← / → 또는 A / D",
    "액션: Space",
    "재시작: R",
  ];
}

function overviewByGame(game: GameRow): string[] {
  const flavor = resolvePlayFlavor(game);
  const lines: string[] = [];
  lines.push("목표를 빠르게 파악하고 즉시 플레이하세요.");

  if (flavor === "racing") {
    lines.push("체크포인트를 연속 통과하며 충돌 없이 완주 시간을 단축하세요.");
    lines.push("코너 진입 전 감속하고 탈출 구간에서 재가속하면 안정적으로 기록이 오릅니다.");
    return lines;
  }

  if (flavor === "flight") {
    lines.push("링 통과를 이어가며 속도와 기체 안정성을 동시에 유지하세요.");
    lines.push("피치·롤·요를 짧게 분리 조작하면 경로 이탈을 줄일 수 있습니다.");
    return lines;
  }

  if (flavor === "fps") {
    lines.push("이동과 공격 리듬을 유지해 생존 시간과 처치 효율을 동시에 올리세요.");
    lines.push("정면에서 버티기보다 측면 이동으로 전장을 관리하면 안정성이 올라갑니다.");
    return lines;
  }

  if (flavor === "brawler") {
    lines.push("거리 조절과 회피 타이밍을 맞춰 연속 공격 기회를 만드세요.");
    lines.push("짧은 콤보를 안정적으로 연결하면 점수와 생존율이 함께 올라갑니다.");
    return lines;
  }

  lines.push("상단 목표와 조작 안내를 기준으로 핵심 루프를 빠르게 익히세요.");
  lines.push("초반에는 생존 우선으로 운영하고, 익숙해지면 점수 루프를 확장하세요.");
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

async function renderPlayPage(typedGame: GameRow, previewMode: boolean) {
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
  const artifactSignal = previewMode ? null : await resolveArtifactHealthSignal(typedGame);

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
          {artifactSignal?.level === "warn" ? (
            <p className="play-artifact-warning" role="status">
              ⚠ {artifactSignal.message}
            </p>
          ) : null}
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
        controlsHint={previewMode ? controlsByGame(typedGame) : []}
        overview={overviewByGame(typedGame)}
      />
    </section>
  );
}
