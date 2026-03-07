import { GameCard } from "@/components/GameCard";

import type { Database } from "@/types/database";

type GameRow = Database["public"]["Tables"]["games_metadata"]["Row"];

export function HomeGameGrid({ rows }: { rows: GameRow[] }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Catalog</p>
          <h2 className="mt-2 font-display text-[2rem] tracking-[-0.04em] text-foreground">게임 목록</h2>
        </div>
        <span className="text-sm text-muted-foreground">{rows.length}개</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((game) => (
          <GameCard key={game.id} game={game} variant="featured" />
        ))}
      </div>
    </section>
  );
}
