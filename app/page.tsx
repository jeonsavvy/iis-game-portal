import Link from "next/link";

import { GameCard } from "@/components/GameCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { filterPublicGames, sortPublicGames } from "@/lib/games/public-catalog";
import { isPreviewMode, loadCatalogGames } from "@/lib/games/public-data";

type HomeSearchParams = {
  q?: string;
};

function buildGenreLinks(rows: Awaited<ReturnType<typeof loadCatalogGames>>) {
  const genres = Array.from(
    new Set(
      rows.flatMap((game) => [game.genre_primary ?? game.genre, ...(game.genre_tags ?? [])]).filter(Boolean),
    ),
  );
  return genres.slice(0, 8);
}

function SectionHeader({ title, description, href }: { title: string; description: string; href?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[1.8rem] font-bold tracking-[-0.04em] text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {href ? (
        <Button asChild variant="ghost" className="justify-start sm:justify-center">
          <Link href={href}>전체 보기</Link>
        </Button>
      ) : null}
    </div>
  );
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<HomeSearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const previewMode = isPreviewMode();

  const allGames = await loadCatalogGames();
  const rows = filterPublicGames(allGames, { q });
  const popularGames = sortPublicGames(rows, "popular").slice(0, 6);
  const newestGames = sortPublicGames(rows, "newest").slice(0, 6);
  const heroGame = popularGames[0] ?? newestGames[0] ?? null;
  const genreLinks = buildGenreLinks(allGames);
  const heroTitle = q ? heroGame?.name ?? q : "AI로 게임 만들고, 바로 플레이하세요";

  return (
    <section className="grid gap-8">
      <Card className="overflow-hidden rounded-[1.5rem] border-white/10 bg-[#111118]/92 p-6 sm:p-8 lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-end">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-accent">AI Game Platform</Badge>
              {previewMode ? <Badge variant="secondary">Preview</Badge> : null}
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-bold leading-none tracking-[-0.06em] text-foreground sm:text-5xl lg:text-[4.8rem]">{heroTitle}</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {q
                  ? `‘${q}’ 검색 결과를 보여드리고 있습니다.`
                  : "AI로 게임을 만들고, 인기 게임과 신규 게임을 빠르게 탐색하고, 바로 플레이할 수 있는 한국형 게임 플랫폼 구조로 개편했습니다."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/create">AI로 게임 만들기</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/discover">인기 게임 보기</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <Card className="rounded-[1.1rem] border-white/8 bg-white/[0.03] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">바로 이해되는 구조</p>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                <li>• AI로 게임 만들기</li>
                <li>• 인기 게임 / 신규 게임</li>
                <li>• 게임 상세 / 바로 플레이</li>
                <li>• 내 작업공간</li>
              </ul>
            </Card>
            <Card className="rounded-[1.1rem] border-white/8 bg-white/[0.03] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">빠른 이동</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {genreLinks.map((genre) => (
                  <Button key={genre} asChild variant="outline" size="sm">
                    <Link href={`/discover?genre=${encodeURIComponent(genre)}`}>{genre}</Link>
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Card>

      <section className="grid gap-4">
        <SectionHeader title="인기 게임" description="지금 많이 플레이되는 게임부터 바로 확인하세요." href="/discover?sort=popular" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {popularGames.map((game) => (
            <GameCard key={`popular-${game.id}`} game={game} variant="featured" />
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <SectionHeader title="신규 게임" description="방금 올라온 게임과 새롭게 공개된 빌드를 모았습니다." href="/discover?sort=newest" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {newestGames.map((game) => (
            <GameCard key={`new-${game.id}`} game={game} variant="compact" />
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <SectionHeader title="장르별 찾기" description="레이싱, 비행, 퍼즐처럼 원하는 장르만 빠르게 골라보세요." href="/discover" />
        <Card className="rounded-[1.25rem] border-white/8 bg-[#111118]/88 p-5">
          <div className="flex flex-wrap gap-2">
            {genreLinks.map((genre) => (
              <Button key={`genre-${genre}`} asChild variant="outline">
                <Link href={`/discover?genre=${encodeURIComponent(genre)}`}>{genre}</Link>
              </Button>
            ))}
          </div>
        </Card>
      </section>
    </section>
  );
}
