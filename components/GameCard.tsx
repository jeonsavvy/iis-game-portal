import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { shouldUseUnoptimizedImage } from "@/lib/images/optimization";
import type { Database } from "@/types/database";
import { cn } from "@/lib/utils";

type Game = Database["public"]["Tables"]["games_metadata"]["Row"];

type GameCardVariant = "default" | "featured" | "compact";

const variantMap: Record<GameCardVariant, { media: string }> = {
  default: { media: "aspect-[16/10]" },
  featured: { media: "aspect-[16/9]" },
  compact: { media: "aspect-[4/3]" },
};

export function GameCard({ game, variant = "default" }: { game: Game; variant?: GameCardVariant }) {
  const imageUrl = game.hero_image_url ?? game.thumbnail_url ?? game.screenshot_url;
  const playPath = `/play/${game.slug}`;
  const summary = game.short_description?.trim() || game.marketing_summary?.trim() || "브라우저에서 즉시 실행";
  const style = variantMap[variant];

  return (
    <Card className="group overflow-hidden transition-transform duration-300 hover:-translate-y-1">
      <Link href={playPath} className="block">
        <div className={cn("relative overflow-hidden bg-zinc-100", style.media)}>
          {imageUrl ? (
            <Image
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
              src={imageUrl}
              alt={`${game.name} cover`}
              fill
              sizes={variant === "compact" ? "(max-width: 820px) 100vw, 25vw" : "(max-width: 820px) 100vw, 33vw"}
              unoptimized={shouldUseUnoptimizedImage(imageUrl)}
            />
          ) : null}
        </div>
        <div className="grid gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{game.genre_primary ?? game.genre}</Badge>
            <Badge variant="accent">{Number(game.play_count_cached ?? 0).toLocaleString("ko-KR")} plays</Badge>
          </div>
          <h3 className="text-xl font-semibold leading-tight tracking-[-0.03em] text-foreground">{game.name}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{summary}</p>
        </div>
      </Link>
    </Card>
  );
}
