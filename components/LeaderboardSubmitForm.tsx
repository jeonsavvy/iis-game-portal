"use client";

import { FormEvent, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

function getFingerprint(gameId: string): string {
  const key = `iis:fingerprint:${gameId}`;
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const created = `${gameId}-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, created);
  return created;
}

export function LeaderboardSubmitForm({ gameId }: { gameId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [playerName, setPlayerName] = useState("");
  const [score, setScore] = useState<number>(0);
  const [status, setStatus] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Submitting...");

    const fingerprint = getFingerprint(gameId);
    const payload = {
      game_id: gameId,
      player_name: playerName,
      score,
      player_fingerprint: fingerprint,
    } as Database["public"]["Tables"]["leaderboard"]["Insert"];

    const { error } = await supabase.from("leaderboard").insert(payload as never);

    if (error) {
      setStatus(`Failed: ${error.message}`);
      return;
    }

    setStatus("Submitted to leaderboard.");
    setPlayerName("");
    setScore(0);
  };

  return (
    <section className="card">
      <h3>Submit Score</h3>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <input
          className="input"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          placeholder="Player name"
          minLength={1}
          maxLength={24}
          required
        />
        <input
          className="input"
          type="number"
          min={0}
          max={1000000000}
          value={score}
          onChange={(event) => setScore(Number(event.target.value || 0))}
          required
        />
        <button className="button" type="submit">
          Submit
        </button>
      </form>
      {status ? <p>{status}</p> : null}
    </section>
  );
}
