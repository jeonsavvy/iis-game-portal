import Link from "next/link";

import { GameCard } from "@/components/GameCard";
import { PREVIEW_GAMES } from "@/lib/demo/preview-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const GENRE_OPTIONS = ["all", "arcade", "puzzle", "survival", "score-attack"] as const;
const SORT_OPTIONS = ["newest", "oldest", "name"] as const;

const GENRE_LABELS: Record<(typeof GENRE_OPTIONS)[number], string> = {
  all: "전체 장르",
  arcade: "아케이드",
  puzzle: "퍼즐",
  survival: "서바이벌",
  "score-attack": "스코어어택",
};

const SORT_LABELS: Record<(typeof SORT_OPTIONS)[number], string> = {
  newest: "최신순",
  oldest: "오래된순",
  name: "이름순",
};

type HomeSearchParams = {
  genre?: string;
  sort?: string;
  q?: string;
  playable?: string;
};

type GameRow = Database["public"]["Tables"]["games_metadata"]["Row"];

function parseDate(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function uniqueById(rows: GameRow[]): GameRow[] {
  const map = new Map(rows.map((row) => [row.id, row]));
  return Array.from(map.values());
}

function isExperimentalCandidate(game: GameRow): boolean {
  const text = `${game.name} ${game.slug} ${game.genre}`.toLowerCase();
  return /(lab|experimental|prototype|alpha|beta|test|sandbox|demo|실험|프로토)/.test(text);
}

function resolveHeroGame(rows: GameRow[]): GameRow | null {
  if (rows.length === 0) return null;
  const featuredSlug = process.env.FEATURED_GAME_SLUG?.trim().toLowerCase();
  if (featuredSlug) {
    const curated = rows.find((row) => row.status === "active" && row.slug.toLowerCase() === featuredSlug);
    if (curated) return curated;
  }

  return rows.find((row) => row.status === "active") ?? rows[0] ?? null;
}

function sectionRows(rows: GameRow[]) {
  const playable = rows.filter((row) => row.status === "active");

  const latest = [...rows].sort((a, b) => parseDate(b.created_at) - parseDate(a.created_at));
  const updated = [...rows].sort((a, b) => parseDate(b.updated_at) - parseDate(a.updated_at));
  const curated = rows.filter(isExperimentalCandidate);

  const genreOrder = ["arcade", "puzzle", "survival", "score-attack"];
  const genreShowcase = genreOrder
    .map((genre) => rows.find((row) => row.genre.toLowerCase() === genre))
    .filter((row): row is GameRow => Boolean(row));

  return {
    playable: uniqueById(playable).slice(0, 8),
    latest: uniqueById(latest).slice(0, 8),
    genreShowcase: uniqueById(genreShowcase).slice(0, 8),
    curated: uniqueById(curated.length > 0 ? curated : latest).slice(0, 8),
    updated: uniqueById(updated).slice(0, 8),
  };
}

function applyHomeFilters(
  sourceRows: GameRow[],
  {
    genre,
    sort,
    q,
    playableOnly,
  }: {
    genre: (typeof GENRE_OPTIONS)[number];
    sort: (typeof SORT_OPTIONS)[number];
    q: string;
    playableOnly: boolean;
  },
): GameRow[] {
  let rows = sourceRows.filter((game) => game.status !== "archived");

  if (playableOnly) {
    rows = rows.filter((game) => game.status === "active");
  }

  if (genre !== "all") {
    rows = rows.filter((game) => game.genre === genre);
  }

  if (q) {
    const keyword = q.toLowerCase();
    rows = rows.filter((game) => game.name.toLowerCase().includes(keyword));
  }

  if (sort === "name") {
    rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  } else {
    rows = [...rows].sort((a, b) => parseDate(a.created_at) - parseDate(b.created_at));
    if (sort === "newest") {
      rows.reverse();
    }
  }

  return rows;
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<HomeSearchParams> }) {
  const params = searchParams ? await searchParams : {};

  const genre =
    params.genre && GENRE_OPTIONS.includes(params.genre as (typeof GENRE_OPTIONS)[number])
      ? (params.genre as (typeof GENRE_OPTIONS)[number])
      : "all";
  const sort =
    params.sort && SORT_OPTIONS.includes(params.sort as (typeof SORT_OPTIONS)[number])
      ? (params.sort as (typeof SORT_OPTIONS)[number])
      : "newest";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const playableOnly = params.playable === "1";
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";

  let rows: GameRow[] = [];
  let loadError: string | null = null;

  if (previewMode) {
    rows = applyHomeFilters(PREVIEW_GAMES, { genre, sort, q, playableOnly });
  } else {
    try {
      const supabase = await createSupabaseServerClient();
      let query = supabase.from("games_metadata").select("*").neq("status", "archived");

      if (playableOnly) {
        query = query.eq("status", "active");
      }

      if (genre !== "all") {
        query = query.eq("genre", genre);
      }

      if (q) {
        query = query.ilike("name", `%${q}%`);
      }

      if (sort === "name") {
        query = query.order("name", { ascending: true });
      } else {
        query = query.order("created_at", { ascending: sort === "oldest" });
      }

      const { data, error } = await query;

      if (error) {
        loadError = error.message;
      } else {
        rows = (data ?? []) as GameRow[];
      }
    } catch (error) {
      loadError = error instanceof Error ? error.message : "알 수 없는 오류";
    }
  }

  const heroGame = resolveHeroGame(rows);
  const sections = sectionRows(rows);

  const heroImage = heroGame?.screenshot_url ?? heroGame?.thumbnail_url ?? null;
  const heroBackground = heroImage
    ? `linear-gradient(120deg, rgba(8,12,19,0.88) 0%, rgba(8,12,19,0.45) 52%, rgba(8,12,19,0.9) 100%), url(${heroImage})`
    : "linear-gradient(120deg, #0f172a 0%, #111827 38%, #1f2937 100%)";

  return (
    <section className="arcade-home-page">
      <section className="surface arcade-hero-showcase" style={{ backgroundImage: heroBackground }}>
        <div className="arcade-hero-content">
          <p className="arcade-kicker">IIS ARCADE</p>
          <h1>{heroGame?.name ?? "게임을 탐색하고 바로 플레이하세요"}</h1>
          <p className="arcade-hero-description">
            {heroGame
              ? `${heroGame.genre} 장르 대표작을 바로 실행하거나 상세 화면에서 조작법과 연관 게임을 확인하세요.`
              : "지금 생성된 게임이 없습니다. 스튜디오 콘솔에서 파이프라인을 실행하면 자동으로 등록됩니다."}
          </p>
          {previewMode ? <p className="arcade-preview-note">프리뷰 모드: 실서버 연결 없이 샘플 데이터로 화면을 검수 중입니다.</p> : null}
          <div className="arcade-hero-actions">
            {heroGame ? (
              <>
                <Link className="button button-primary" href={`/play/${heroGame.id}`}>
                  지금 플레이
                </Link>
                <Link className="button button-ghost" href={`/play/${heroGame.id}#overview`}>
                  상세 보기
                </Link>
              </>
            ) : (
              <Link className="button button-ghost" href="/admin">
                스튜디오 콘솔 이동
              </Link>
            )}
          </div>
        </div>

        <aside className="arcade-hero-side">
          <div className="arcade-hero-stat">
            <span>활성 게임</span>
            <strong>{rows.filter((row) => row.status === "active").length}</strong>
          </div>
          <div className="arcade-hero-stat">
            <span>최근 업데이트</span>
            <strong>{rows.length > 0 ? new Date(rows[0].updated_at).toLocaleDateString("ko-KR") : "-"}</strong>
          </div>
          <div className="arcade-hero-stat muted">
            <span>큐레이션 기준</span>
            <strong>{process.env.FEATURED_GAME_SLUG ? "FEATURED_GAME_SLUG" : "최신 플레이 가능 게임"}</strong>
          </div>
        </aside>
      </section>

      <form className="surface quick-discover-bar" method="GET">
        <div className="quick-discover-head">
          <div>
            <p className="eyebrow">빠른 탐색</p>
            <h2 className="section-title">빠른 탐색</h2>
          </div>
          <details className="quick-discover-advanced">
            <summary>고급 안내</summary>
            <p>정렬+장르+검색으로 좁힌 뒤 플레이 가능만 켜면 즉시 실행 가능한 게임만 빠르게 찾을 수 있습니다.</p>
          </details>
        </div>

        <div className="quick-discover-grid">
          <label className="field">
            <span>정렬</span>
            <select className="input" name="sort" defaultValue={sort}>
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>장르</span>
            <select className="input" name="genre" defaultValue={genre}>
              {GENRE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {GENRE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <label className="field field-search">
            <span>게임 검색</span>
            <input className="input" name="q" defaultValue={q} placeholder="게임 이름으로 검색" />
          </label>

          <label className="playable-filter-toggle">
            <input type="checkbox" name="playable" value="1" defaultChecked={playableOnly} />
            <span>플레이 가능한 게임만 보기</span>
          </label>

          <button className="button button-primary" type="submit">
            필터 적용
          </button>
        </div>
      </form>

      {loadError && !previewMode ? (
        <section className="surface arcade-empty-state">
          <h3>데이터를 불러오지 못했습니다</h3>
          <p>{loadError}</p>
        </section>
      ) : null}

      {rows.length === 0 ? (
        <section className="surface arcade-empty-state">
          <h3>조건에 맞는 게임이 없습니다</h3>
          <p>검색어를 조정하거나 스튜디오 콘솔에서 새로운 파이프라인을 실행해보세요.</p>
        </section>
      ) : (
        <>
          <section className="arcade-section">
            <div className="arcade-section-head">
              <h3>지금 플레이 가능</h3>
              <span>{sections.playable.length}개</span>
            </div>
            <div className="arcade-game-grid featured-grid">
              {sections.playable.map((game) => (
                <GameCard key={`playable-${game.id}`} game={game} variant="featured" />
              ))}
            </div>
          </section>

          <section className="arcade-section">
            <div className="arcade-section-head">
              <h3>최신 생성작</h3>
              <span>최근 생성 순</span>
            </div>
            <div className="arcade-game-grid">
              {sections.latest.map((game) => (
                <GameCard key={`latest-${game.id}`} game={game} />
              ))}
            </div>
          </section>

          <section className="arcade-section">
            <div className="arcade-section-head">
              <h3>장르별 탐색</h3>
              <span>장르 대표작</span>
            </div>
            <div className="arcade-game-grid compact-grid">
              {sections.genreShowcase.map((game) => (
                <GameCard key={`genre-${game.id}`} game={game} variant="compact" />
              ))}
            </div>
          </section>

          <section className="arcade-section two-column">
            <div>
              <div className="arcade-section-head">
                <h3>큐레이터 픽 / 실험작</h3>
                <span>탐색 추천</span>
              </div>
              <div className="arcade-game-grid compact-grid">
                {sections.curated.map((game) => (
                  <GameCard key={`curated-${game.id}`} game={game} variant="compact" />
                ))}
              </div>
            </div>

            <div>
              <div className="arcade-section-head">
                <h3>최근 업데이트</h3>
                <span>개선 반영 순</span>
              </div>
              <div className="arcade-game-grid compact-grid">
                {sections.updated.map((game) => (
                  <GameCard key={`updated-${game.id}`} game={game} variant="compact" />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
