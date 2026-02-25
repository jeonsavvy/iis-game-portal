import Image from "next/image";
import Link from "next/link";

import type { Database } from "@/types/database";

type Game = Database["public"]["Tables"]["games_metadata"]["Row"];

type GameCardVariant = "default" | "featured" | "compact";

function formatDateLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export function GameCard({ game, variant = "default" }: { game: Game; variant?: GameCardVariant }) {
  const isPlayable = game.status === "active";
  const imageUrl = game.thumbnail_url ?? game.screenshot_url;

  return (
    <article className={`arcade-game-card variant-${variant}`}>
      <Link className="arcade-game-card-media" href={`/play/${game.id}`}>
        {imageUrl ? (
          <Image className="arcade-game-card-image" src={imageUrl} alt={`${game.name} cover`} fill sizes="(max-width: 820px) 100vw, 33vw" unoptimized />
        ) : (
          <div className="arcade-game-card-fallback" aria-hidden="true" />
        )}
        <div className="arcade-game-card-badges">
          <span className="pill">{game.genre}</span>
          <span className={`status-chip ${isPlayable ? "tone-success" : "tone-warn"}`}>{isPlayable ? "PLAYABLE" : "COMING"}</span>
        </div>
      </Link>

      <div className="arcade-game-card-body">
        <h4>{game.name}</h4>
        <p>{game.slug}</p>

        <div className="arcade-game-card-foot">
          <span>{formatDateLabel(game.created_at)}</span>
          <Link className="button button-primary" href={`/play/${game.id}`}>
            {isPlayable ? "지금 플레이" : "상세 보기"}
          </Link>
        </div>
      </div>
    </article>
  );
}
