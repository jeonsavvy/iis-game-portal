// 공개 카탈로그 첫 화면입니다.
// 검색 조건과 노출 규칙을 여기서 확정해 홈과 카탈로그가 같은 기준을 보게 합니다.

import Link from "next/link";

import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resolveGenreLabel } from "@/lib/games/presentation";
import { filterPublicGames, type PublicSort, sortPublicGames } from "@/lib/games/public-catalog";
import { loadCatalogGames } from "@/lib/games/public-data";

type HomeSearchParams = {
  q?: string;
  genre?: string;
  sort?: string;
};

const SORT_OPTIONS: PublicSort[] = ["popular", "newest", "name"];

function sectionTitle(sort: PublicSort, hasQuery: boolean) {
  if (hasQuery) return "검색 결과";
  if (sort === "newest") return "신규 게임";
  return "지금 뜨는 게임";
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<HomeSearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const genre = typeof params.genre === "string" ? params.genre.trim() : "";
  const sort = SORT_OPTIONS.includes(params.sort as PublicSort) ? (params.sort as PublicSort) : "popular";

  const allGames = await loadCatalogGames();
  const visibleGames = filterPublicGames(allGames, { q, genre });
  const topPlayedGame = sortPublicGames(filterPublicGames(allGames, {}), "popular")[0] ?? null;
  const newestGames = sortPublicGames(filterPublicGames(allGames, {}), "newest").slice(0, 6);
  const filteredGames = sortPublicGames(visibleGames, sort);
  const genres = Array.from(new Set(allGames.map((game) => resolveGenreLabel(game)).filter(Boolean))).slice(0, 6);
  const hasQuery = Boolean(q || genre);

  return (
    <section className="grid gap-8">
      <Card className="p-4">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem_auto] md:items-center" method="GET">
          <Input name="q" defaultValue={q} placeholder="게임 검색" />
          <select
            name="sort"
            defaultValue={sort}
            className="flex h-11 w-full rounded-2xl border border-[#1b1337]/12 bg-white/82 px-4 text-sm text-foreground outline-none shadow-[0_10px_24px_rgba(27,19,55,0.04)] transition focus:border-primary"
          >
            <option value="popular">인기순</option>
            <option value="newest">신규순</option>
            <option value="name">이름순</option>
          </select>
          <Button type="submit">적용</Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant={!genre ? "default" : "outline"} size="sm">
            <Link href={q ? `/?q=${encodeURIComponent(q)}` : "/"}>전체</Link>
          </Button>
          {genres.map((item) => (
            <Button key={item} asChild variant={genre === item ? "default" : "outline"} size="sm">
              <Link href={`/?genre=${encodeURIComponent(item)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>{item}</Link>
            </Button>
          ))}
        </div>
      </Card>

      {!hasQuery ? (
        <section className="grid gap-4">
          <div>
            <h2 className="text-[1.6rem] font-semibold tracking-[-0.03em] text-foreground">추천 게임</h2>
          </div>
          {topPlayedGame ? (
            <GameCard key={`featured-${topPlayedGame.id}`} game={topPlayedGame} variant="featured" />
          ) : (
            <Card className="p-6 text-sm text-muted-foreground">표시할 게임이 없습니다.</Card>
          )}
        </section>
      ) : null}

      {hasQuery || sort !== "popular" ? (
        <section className="grid gap-4">
          <div>
            <h2 className="text-[1.6rem] font-semibold tracking-[-0.03em] text-foreground">{sectionTitle(sort, hasQuery)}</h2>
            {hasQuery ? <p className="mt-1 text-sm text-muted-foreground">조건에 맞는 게임만 모았습니다.</p> : null}
          </div>
          {filteredGames.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">조건에 맞는 게임이 없습니다.</Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredGames.map((game) => (
                <GameCard key={`filtered-${game.id}`} game={game} variant="default" />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {!hasQuery ? (
        <section className="grid gap-4">
          <div>
            <h2 className="text-[1.6rem] font-semibold tracking-[-0.03em] text-foreground">신규 게임</h2>
            <p className="mt-1 text-sm text-muted-foreground">최근 올라온 게임을 확인해보세요.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {newestGames.map((game) => (
              <GameCard key={`new-${game.id}`} game={game} variant="default" />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
