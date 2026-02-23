import Link from "next/link";

import type { Database } from "@/types/database";

type Game = Database["public"]["Tables"]["games_metadata"]["Row"];

function genreTone(genre: string): string {
  const normalized = genre.toLowerCase();
  if (normalized.includes("puzzle")) return "puzzle";
  if (normalized.includes("survival")) return "survival";
  if (normalized.includes("score")) return "score";
  return "arcade";
}

export function GameCard({ game }: { game: Game }) {
  const createdAtLabel = new Date(game.created_at).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });

  return (
    <article className={`game-card tone-${genreTone(game.genre)}`}>
      <div className="game-card-art" aria-hidden="true">
        <div className="game-card-noise" />
        <div className="game-card-glow" />
        <div className="game-card-topline">
          <span className="pill">{game.genre}</span>
          <span className="game-card-date">{createdAtLabel}</span>
        </div>
        <div className="game-card-art-copy">
          <h3>{game.name}</h3>
          <p>{game.slug}</p>
        </div>
      </div>

      <div className="game-card-body">
        <div className="game-card-actions">
          <Link className="button button-primary" href={`/play/${game.id}`}>
            ▶ Play
          </Link>
        </div>
      </div>
    </article>
  );
}
