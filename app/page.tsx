import { GameCard } from "@/components/GameCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const GENRE_OPTIONS = ["all", "arcade", "puzzle", "survival", "score-attack"] as const;
const SORT_OPTIONS = ["newest", "oldest", "name"] as const;

type HomeSearchParams = {
  genre?: string;
  sort?: string;
};

export default async function HomePage({ searchParams }: { searchParams?: Promise<HomeSearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const genre = params.genre && GENRE_OPTIONS.includes(params.genre as (typeof GENRE_OPTIONS)[number]) ? params.genre : "all";
  const sort = params.sort && SORT_OPTIONS.includes(params.sort as (typeof SORT_OPTIONS)[number]) ? params.sort : "newest";

  const supabase = await createSupabaseServerClient();

  let query = supabase.from("games_metadata").select("*").eq("status", "active");
  if (genre !== "all") {
    query = query.eq("genre", genre);
  }

  if (sort === "name") {
    query = query.order("name", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: sort === "oldest" });
  }

  const { data: games, error } = await query;

  if (error) {
    return <p>Failed to load games: {error.message}</p>;
  }

  const typedGames = (games ?? []) as Database["public"]["Tables"]["games_metadata"]["Row"][];

  return (
    <section>
      <h1>IIS Arcade</h1>
      <p>Netflix-style game shelf for generated web games.</p>

      <form className="card" method="GET" style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <div className="log-filters">
          <label>
            Genre
            <select className="input" name="genre" defaultValue={genre}>
              {GENRE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select className="input" name="sort" defaultValue={sort}>
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="button" type="submit">
          Apply Filters
        </button>
      </form>

      <div className="grid">{typedGames.map((game) => <GameCard key={game.id} game={game} />)}</div>
    </section>
  );
}
