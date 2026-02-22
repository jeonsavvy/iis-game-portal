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

  return (
    <section>
      <form className="card" method="GET" style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <div className="log-filters">
          <label>
            장르
            <select className="input" name="genre" defaultValue={genre}>
              {GENRE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {GENRE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label>
            정렬
            <select className="input" name="sort" defaultValue={sort}>
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          게임 이름
          <input className="input" name="q" defaultValue={q} placeholder="게임 이름으로 검색" />
        </label>
        <button className="button" type="submit">
          필터 적용
        </button>
      </form>

      {typedGames.length === 0 ? (
        <section className="card">
          <p style={{ margin: 0 }}>조건에 맞는 게임이 아직 없습니다.</p>
        </section>
      ) : (
        <div className="grid">{typedGames.map((game) => <GameCard key={game.id} game={game} />)}</div>
      )}
    </section>
  );
}
