import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { shouldUseUnoptimizedImage } from "@/lib/images/optimization";
import type { Database } from "@/types/database";
import { cn } from "@/lib/utils";

type Game = Database["public"]["Tables"]["games_metadata"]["Row"];

type GameCardVariant = "default" | "featured" | "compact";

const variantMap: Record<GameCardVariant, { media: string; copy: string }> = {
  default: { media: "aspect-[16/10]", copy: "space-y-4" },
  featured: { media: "aspect-[16/9]", copy: "space-y-5" },
  compact: { media: "aspect-[4/3]", copy: "space-y-3" },
};

export function GameCard({ game, variant = "default" }: { game: Game; variant?: GameCardVariant }) {
  const imageUrl = game.hero_image_url ?? game.thumbnail_url ?? game.screenshot_url;
  const playPath = `/play/${game.slug}`;
  const detailPath = `/games/${game.slug}`;
  const summary = game.short_description?.trim() || game.marketing_summary?.trim() || "브라우저에서 즉시 실행";
  const style = variantMap[variant];
  const tags = Array.from(new Set([game.genre_primary ?? game.genre, ...(game.genre_tags ?? [])])).filter(Boolean).slice(0, 3);
  const playCount = typeof game.play_count_cached === "number" ? game.play_count_cached : 0;

  return (
    <Card className="group overflow-hidden rounded-[1.2rem] border-white/8 bg-[#111118]/90 transition-transform duration-300 hover:-translate-y-1">
      <Link href={detailPath} className={cn("relative block overflow-hidden border-b border-white/6", style.media)}>
        {imageUrl ? (
          <Image
            className="object-cover transition duration-500 group-hover:scale-[1.035]"
            src={imageUrl}
            alt={`${game.name} cover`}
            fill
            sizes={variant === "compact" ? "(max-width: 820px) 100vw, 25vw" : "(max-width: 820px) 100vw, 33vw"}
            unoptimized={shouldUseUnoptimizedImage(imageUrl)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#b4935e]/20 to-[#33489c]/20" aria-hidden="true" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <Badge variant="outline" className="border-white/15 bg-black/30 text-[10px] text-foreground/90">바로 플레이</Badge>
          <Badge variant="secondary" className="bg-black/25 text-[10px] text-muted-foreground">{game.genre_primary ?? game.genre}</Badge>
        </div>
      </Link>

      <div className={cn("p-5", style.copy)}>
        <div className="space-y-2">
          <h3 className="font-display text-[1.5rem] leading-[1.05] tracking-[-0.04em] text-balance text-foreground">{game.name}</h3>
          <p className="min-h-12 text-sm leading-6 text-muted-foreground">{summary}</p>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {tags.map((tag) => (
                <Badge key={`${game.id}-${tag}`} variant="outline" className="border-white/10 text-[10px] text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/6 pt-4">
          <p className="text-xs text-muted-foreground">플레이 {playCount.toLocaleString("ko-KR")}회</p>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size={variant === "compact" ? "sm" : "default"}>
              <Link href={detailPath}>상세 보기</Link>
            </Button>
            <Button asChild size={variant === "compact" ? "sm" : "default"}>
              <Link href={playPath}>바로 플레이</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
