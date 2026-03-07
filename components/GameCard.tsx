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
  const imageUrl = game.thumbnail_url ?? game.screenshot_url;
  const playPath = `/play/${game.slug}`;
  const summary = game.marketing_summary?.trim() || "브라우저에서 즉시 실행";
  const style = variantMap[variant];

  return (
    <Card className="group overflow-hidden rounded-[1.7rem] border-white/8 bg-[#111118]/90 transition-transform duration-300 hover:-translate-y-1.5">
      <Link href={playPath} className={cn("relative block overflow-hidden border-b border-white/6", style.media)}>
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
          <Badge variant="outline" className="border-white/15 bg-black/30 text-[10px] text-foreground/90">PLAY</Badge>
          <Badge variant="secondary" className="bg-black/25 text-[10px] text-muted-foreground">{game.genre}</Badge>
        </div>
      </Link>

      <div className={cn("p-5", style.copy)}>
        <div className="space-y-2">
          <h3 className="font-display text-[1.5rem] leading-[1.05] tracking-[-0.04em] text-balance text-foreground">{game.name}</h3>
          <p className="min-h-12 text-sm leading-6 text-muted-foreground">{summary}</p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/6 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Launch into play</p>
          <Button asChild size={variant === "compact" ? "sm" : "default"}>
            <Link href={playPath}>지금 플레이</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
