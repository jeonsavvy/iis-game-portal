import Link from "next/link";

import type { Database } from "@/types/database";

type Game = Database["public"]["Tables"]["games_metadata"]["Row"];

export function GameCard({ game }: { game: Game }) {
  return (
    <article className="card">
      <div className="pill">{game.genre}</div>
      <h3>{game.name}</h3>
      <p>{game.slug}</p>
      <Link className="button" href={`/play/${game.id}`}>
        Play
      </Link>
    </article>
  );
}
