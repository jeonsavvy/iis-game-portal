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
      <section className="portal-hero" style={{ background: 'var(--nintendo-red)', color: 'white', borderRadius: 'var(--radius-lg)', padding: '40px', marginBottom: '32px' }}>
        <div className="portal-hero-main">
          <h1 className="hero-title" style={{ fontSize: '48px', fontWeight: 900, margin: 0 }}>IIS ARCADE</h1>
          <p className="section-subtitle" style={{ fontSize: '18px', opacity: 0.9, marginTop: '8px' }}>
            Choose your game and let the AI-generated fun begin!
          </p>
        </div>
      </section>

      <form className="surface filter-panel" method="GET" style={{ background: 'var(--panel-strong)', border: 'none' }}>
        <div className="section-head compact">
          <div>
            <h2 className="section-title" style={{ color: 'var(--blue)' }}>게임 라이브러리</h2>
          </div>
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
          <button className="button button-primary filter-submit" type="submit" style={{ background: 'var(--blue)', color: '#000' }}>
            필터 적용
          </button>
        </div>
      </form>

      <section className="section-block">

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
