import Link from "next/link";
import { notFound } from "next/navigation";

import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadCreatorProfile, loadGamesByCreator } from "@/lib/games/creator-data";

export default async function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [creator, games] = await Promise.all([loadCreatorProfile(id), loadGamesByCreator(id)]);
  if (!creator) notFound();

  return (
    <section className="grid gap-6">
      <Card className="rounded-[1.5rem] border-white/10 bg-[#111118]/92 p-6 sm:p-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">{creator.alias}</h1>
          <p className="text-sm leading-7 text-muted-foreground">{creator.headline}</p>
          <p className="text-sm text-muted-foreground">공개 게임 {creator.gameCount}개</p>
        </div>
        <div className="mt-5">
          <Button asChild variant="outline">
            <Link href="/discover">게임 탐색으로 돌아가기</Link>
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => (
          <GameCard key={game.id} game={game} variant="featured" />
        ))}
      </div>
    </section>
  );
}
