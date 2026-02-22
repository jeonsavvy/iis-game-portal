import { GameCard } from "@/components/GameCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const GENRE_OPTIONS = ["all", "arcade", "puzzle", "survival", "score-attack"] as const;
const SORT_OPTIONS = ["newest", "oldest", "name"] as const;

const GENRE_LABELS: Record<(typeof GENRE_OPTIONS)[number], string> = {
  all: "전체",
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
};

export default async function HomePage({ searchParams }: { searchParams?: Promise<HomeSearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const genre = params.genre && GENRE_OPTIONS.includes(params.genre as (typeof GENRE_OPTIONS)[number]) ? params.genre : "all";
  const sort = params.sort && SORT_OPTIONS.includes(params.sort as (typeof SORT_OPTIONS)[number]) ? params.sort : "newest";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = await createSupabaseServerClient();

  let query = supabase.from("games_metadata").select("*").eq("status", "active");
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

  const { data: games, error } = await query;

  if (error) {
    return <p>게임 목록을 불러오지 못했습니다: {error.message}</p>;
  }

  const typedGames = (games ?? []) as Database["public"]["Tables"]["games_metadata"]["Row"][];
  const featuredGame = typedGames[0] ?? null;

  return (
    <section className="portal-page">
      <section className="portal-hero">
        <div className="surface portal-hero-main">
          <p className="eyebrow">Infinite Indie Studio</p>
          <h1 className="hero-title">AI가 계속 만드는 실험적 웹게임 포털</h1>
          <p className="section-subtitle">
            ForgeFlow가 기획·스타일·빌드·QA·게시까지 연결한 결과물을 바로 플레이하고 탐색할 수 있습니다.
          </p>
          <div className="hero-meta-row">
            <span className="status-chip tone-success">실시간 게시 연결</span>
            <span className="status-chip tone-running">ForgeFlow 가동 중</span>
            <span className="status-chip tone-idle">게임 수 {typedGames.length}</span>
          </div>
        </div>

        <div className="portal-hero-side">
          <article className="surface spotlight-card">
            <p className="eyebrow">Featured</p>
            <h2>{featuredGame?.name ?? "아직 게시된 게임이 없습니다"}</h2>
            <p className="section-subtitle">
              {featuredGame
                ? `${featuredGame.genre} · ${featuredGame.slug} · ${new Date(featuredGame.created_at).toLocaleString()}`
                : "Studio Console에서 첫 파이프라인을 실행하면 여기에 대표 게임이 표시됩니다."}
            </p>
            {featuredGame ? (
              <a className="button button-primary" href={`/play/${featuredGame.id}`}>
                대표 게임 플레이
              </a>
            ) : null}
          </article>
        </div>
      </section>

      <form className="surface filter-panel" method="GET">
        <div className="section-head compact">
          <div>
            <p className="eyebrow">탐색</p>
            <h2 className="section-title">게임 검색 및 필터</h2>
          </div>
          <p className="section-subtitle">장르/정렬/이름 검색을 조합해 원하는 실험작을 찾을 수 있습니다.</p>
        </div>

        <div className="filter-grid">
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
          <label className="field field-wide">
            <span>게임 이름</span>
            <input className="input" name="q" defaultValue={q} placeholder="게임 이름으로 검색" />
          </label>
          <button className="button button-primary filter-submit" type="submit">
            필터 적용
          </button>
        </div>
      </form>

      <section className="section-block">
        <div className="section-head">
          <div>
            <p className="eyebrow">Arcade Library</p>
            <h2 className="section-title">생성된 게임 컬렉션</h2>
          </div>
          <p className="section-subtitle">
            현재 필터 기준 결과 {typedGames.length}개 · 장르 {GENRE_LABELS[genre as (typeof GENRE_OPTIONS)[number]]}
          </p>
        </div>

        {typedGames.length === 0 ? (
          <section className="surface empty-state">
            <h3>조건에 맞는 게임이 없습니다</h3>
            <p>검색어를 지우거나 다른 장르/정렬 조합으로 다시 시도해보세요.</p>
          </section>
        ) : (
          <div className="game-grid">{typedGames.map((game) => <GameCard key={game.id} game={game} />)}</div>
        )}
      </section>
    </section>
  );
}
