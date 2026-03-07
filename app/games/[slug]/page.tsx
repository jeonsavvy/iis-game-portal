import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GameShareActions } from "@/components/games/GameShareActions";
import { GameCard } from "@/components/GameCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadCreatorProfile } from "@/lib/games/creator-data";
import { loadCatalogGames, loadGameLeaderboard, loadPublicGameBySlug, loadRelatedGames } from "@/lib/games/public-data";
import { shouldUseUnoptimizedImage } from "@/lib/images/optimization";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await loadPublicGameBySlug(slug);
  if (!game) {
    return { title: "게임 상세 | iis" };
  }

  const description = game.short_description || game.marketing_summary || `${game.name} 상세 페이지`;
  const image = game.hero_image_url || game.thumbnail_url || game.screenshot_url || undefined;

  return {
    title: `${game.name} | iis`,
    description,
    openGraph: {
      title: `${game.name} | iis`,
      description,
      images: image ? [image] : [],
      type: "website",
    },
  };
}

export default async function GameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await loadPublicGameBySlug(slug);
  if (!game) notFound();

  const [leaderboardRows, relatedGames, allGames, creator] = await Promise.all([
    loadGameLeaderboard(game.id, game.slug, 10),
    loadRelatedGames(game, 3),
    loadCatalogGames(),
    loadCreatorProfile(game.created_by),
  ]);

  const heroImage = game.hero_image_url || game.thumbnail_url || game.screenshot_url;
  const overview = game.play_overview ?? [];
  const controls = game.controls_guide ?? [];
  const related = relatedGames.length > 0 ? relatedGames : allGames.filter((row) => row.slug !== game.slug).slice(0, 3);

  return (
    <section className="grid gap-6">
      <Card className="overflow-hidden rounded-[1.5rem] border-white/10 bg-[#111118]/92">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:p-8">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-accent">{game.genre_primary ?? game.genre}</Badge>
              {typeof game.play_count_cached === "number" ? <Badge variant="secondary">플레이 {game.play_count_cached.toLocaleString("ko-KR")}회</Badge> : null}
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground sm:text-5xl">{game.name}</h1>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                {game.description || game.short_description || game.marketing_summary || "게임 상세 설명을 준비 중입니다."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={`/play/${game.slug}`}>바로 플레이</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/discover">다른 게임 보기</Link>
              </Button>
            </div>
          </div>

          <div className="relative min-h-[18rem] overflow-hidden rounded-[1.2rem] border border-white/8 bg-black/30">
            {heroImage ? (
              <Image
                src={heroImage}
                alt={game.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 42vw"
                unoptimized={shouldUseUnoptimizedImage(heroImage)}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" aria-hidden="true" />
          </div>
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6">
          <Card className="rounded-[1.25rem] border-white/8 bg-[#111118]/88 p-6">
            <h2 className="text-[1.6rem] font-bold tracking-[-0.04em] text-foreground">게임 설명</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-7 text-muted-foreground">
              {(overview.length > 0 ? overview : [game.short_description || "설명을 준비 중입니다."]).map((line, index) => (
                <li key={`overview-${index}-${line}`} className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                  {line}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="rounded-[1.25rem] border-white/8 bg-[#111118]/88 p-6">
            <h2 className="text-[1.6rem] font-bold tracking-[-0.04em] text-foreground">조작법</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-7 text-muted-foreground">
              {(controls.length > 0 ? controls : ["게임 실행 화면에서 조작 안내를 확인해 주세요."]).map((line, index) => (
                <li key={`control-${index}-${line}`} className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                  {line}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="rounded-[1.25rem] border-white/8 bg-[#111118]/88 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[1.6rem] font-bold tracking-[-0.04em] text-foreground">비슷한 게임</h2>
                <p className="mt-2 text-sm text-muted-foreground">같은 장르나 비슷한 감각의 게임을 이어서 플레이해보세요.</p>
              </div>
              <Button asChild variant="ghost">
                <Link href="/discover">탐색으로 이동</Link>
              </Button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {related.map((relatedGame) => (
                <GameCard key={`related-${relatedGame.id}`} game={relatedGame} variant="compact" />
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="rounded-[1.25rem] border-white/8 bg-[#111118]/88 p-6">
            <h2 className="text-[1.6rem] font-bold tracking-[-0.04em] text-foreground">리더보드</h2>
            <div className="mt-4 grid gap-3">
              {leaderboardRows.length === 0 ? (
                <p className="rounded-[1rem] border border-dashed border-white/10 px-4 py-5 text-sm text-muted-foreground">아직 등록된 점수가 없습니다.</p>
              ) : (
                leaderboardRows.map((row, index) => (
                  <div key={`leaderboard-${row.id}-${index}`} className="flex items-center justify-between rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{index + 1}. {row.player_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("ko-KR", { hour12: false })}</p>
                    </div>
                    <p className="text-base font-bold text-foreground">{row.score.toLocaleString("ko-KR")}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="rounded-[1.25rem] border-white/8 bg-[#111118]/88 p-6">
            <h2 className="text-[1.6rem] font-bold tracking-[-0.04em] text-foreground">공유하기</h2>
            <p className="mt-2 text-sm text-muted-foreground">상세 링크나 플레이 링크를 복사해 다른 사람과 바로 공유할 수 있습니다.</p>
            <div className="mt-4">
              <GameShareActions
                title={game.name}
                detailUrl={`/games/${game.slug}`}
                playUrl={`/play/${game.slug}`}
              />
            </div>
          </Card>

          <Card className="rounded-[1.25rem] border-white/8 bg-[#111118]/88 p-6">
            <h2 className="text-[1.6rem] font-bold tracking-[-0.04em] text-foreground">제작자</h2>
            {creator ? (
              <div className="mt-4 grid gap-3">
                <p className="text-base font-semibold text-foreground">{creator.alias}</p>
                <p className="text-sm leading-7 text-muted-foreground">{creator.headline}</p>
                <p className="text-sm text-muted-foreground">공개 게임 {creator.gameCount}개</p>
                <Button asChild variant="outline">
                  <Link href={`/creators/${creator.id}`}>제작자 프로필 보기</Link>
                </Button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">제작자 정보를 준비 중입니다.</p>
            )}
          </Card>
        </div>
      </section>
    </section>
  );
}
