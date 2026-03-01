import Image from "next/image";
import Link from "next/link";

import { shouldUseUnoptimizedImage } from "@/lib/images/optimization";
import type { Database } from "@/types/database";

type Game = Database["public"]["Tables"]["games_metadata"]["Row"];

type GameCardVariant = "default" | "featured" | "compact";

export function GameCard({ game, variant = "default" }: { game: Game; variant?: GameCardVariant }) {
  const imageUrl = game.thumbnail_url ?? game.screenshot_url;

  return (
    <article className={`arcade-game-card variant-${variant}`}>
      <Link className="arcade-game-card-media" href={`/play/${game.id}`}>
        {imageUrl ? (
          <Image
            className="arcade-game-card-image"
            src={imageUrl}
            alt={`${game.name} cover`}
            fill
            sizes="(max-width: 820px) 100vw, 33vw"
            unoptimized={shouldUseUnoptimizedImage(imageUrl)}
          />
        ) : (
          <div className="arcade-game-card-fallback" aria-hidden="true" />
        )}
        <div className="arcade-game-card-badges">
          <span className="status-chip tone-success">PLAY</span>
        </div>
      </Link>

      <div className="arcade-game-card-body">
        <h4>{game.name}</h4>
        <p>브라우저에서 즉시 실행</p>

        <div className="arcade-game-card-foot">
          <Link className="button button-primary" href={`/play/${game.id}`}>
            지금 플레이
          </Link>
        </div>
      </div>
    </article>
  );
}
