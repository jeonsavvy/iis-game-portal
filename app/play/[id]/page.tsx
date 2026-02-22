import { notFound } from "next/navigation";

import { Leaderboard } from "@/components/Leaderboard";
import { LeaderboardSubmitForm } from "@/components/LeaderboardSubmitForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: game } = await supabase.from("games_metadata").select("*").eq("id", id).single();
  if (!game) {
    notFound();
  }

  const typedGame = game as unknown as Database["public"]["Tables"]["games_metadata"]["Row"];

  const { data: scores } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("game_id", id)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(20);

  const typedScores = (scores ?? []) as Database["public"]["Tables"]["leaderboard"]["Row"][];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <h1>{typedGame.name}</h1>
      <div className="card" style={{ height: "70vh" }}>
        <iframe
          src={typedGame.url}
          title={typedGame.name}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
      <LeaderboardSubmitForm gameId={typedGame.id} />
      <Leaderboard rows={typedScores} />
    </section>
  );
}
