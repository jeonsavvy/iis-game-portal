import Link from "next/link";

import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { extractGenreTags, filterPublicGames, type PublicSort, sortPublicGames } from "@/lib/games/public-catalog";
import { loadCatalogGames } from "@/lib/games/public-data";

type DiscoverSearchParams = {
  q?: string;
  genre?: string;
  sort?: string;
};

const SORT_OPTIONS: Array<{ value: PublicSort; label: string }> = [
  { value: "popular", label: "인기순" },
  { value: "newest", label: "최신순" },
  { value: "name", label: "이름순" },
];

export default async function DiscoverPage({ searchParams }: { searchParams?: Promise<DiscoverSearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const genre = typeof params.genre === "string" ? params.genre.trim() : "";
  const sort = SORT_OPTIONS.some((option) => option.value === params.sort) ? (params.sort as PublicSort) : "popular";

  const rows = await loadCatalogGames();
  const filtered = sortPublicGames(filterPublicGames(rows, { q, genre }), sort);
  const genres = Array.from(new Set(rows.flatMap((game) => extractGenreTags(game)))).slice(0, 12);

  return (
    <section className="grid gap-6">
      <Card className="rounded-[1.5rem] border-white/10 bg-[#111118]/92 p-6 sm:p-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">게임 탐색</h1>
          <p className="text-sm leading-7 text-muted-foreground">인기순, 최신순, 장르 필터로 원하는 게임을 빠르게 찾고 바로 플레이하세요.</p>
        </div>

        <form className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,12rem)_auto]" method="GET">
          <Input name="q" defaultValue={q} placeholder="게임 이름 또는 특징 검색" />
          <select
            name="sort"
            defaultValue={sort}
            className="flex h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-foreground outline-none transition focus:border-white/20"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button type="submit">적용</Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant={!genre ? "default" : "outline"} size="sm">
            <Link href="/discover">전체</Link>
          </Button>
          {genres.map((item) => (
            <Button key={item} asChild variant={genre === item ? "default" : "outline"} size="sm">
              <Link href={`/discover?genre=${encodeURIComponent(item)}&sort=${sort}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>{item}</Link>
            </Button>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[1.8rem] font-bold tracking-[-0.04em] text-foreground">검색 결과</h2>
          <p className="mt-2 text-sm text-muted-foreground">{filtered.length}개의 게임을 찾았습니다.</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-[1.25rem] border-white/8 bg-[#111118]/88 p-6 text-sm text-muted-foreground">
          검색 결과가 없습니다. 다른 검색어나 장르를 선택해보세요.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} variant="featured" />
          ))}
        </div>
      )}
    </section>
  );
}
