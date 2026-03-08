import { describe, expect, it } from "vitest";

import { extractGenreTags, filterPublicGames, sortPublicGames } from "@/lib/games/public-catalog";

const GAMES = [
  {
    id: "game-1",
    name: "Neon Drift",
    genre: "racing",
    genre_primary: "racing",
    genre_tags: ["3d", "time-attack"],
    play_count_cached: 120,
    created_at: "2026-03-05T10:00:00.000Z",
  },
  {
    id: "game-2",
    name: "Skyline Jet",
    genre: "flight",
    genre_primary: "flight",
    genre_tags: ["3d", "dogfight"],
    play_count_cached: 40,
    created_at: "2026-03-06T10:00:00.000Z",
  },
  {
    id: "game-3",
    name: "Puzzle Lab",
    genre: "puzzle",
    genre_primary: null,
    genre_tags: null,
    play_count_cached: 80,
    created_at: "2026-03-04T10:00:00.000Z",
  },
] as const;

describe("extractGenreTags", () => {
  it("deduplicates primary, legacy genre, and tags", () => {
    expect(extractGenreTags(GAMES[0] as never)).toEqual(["racing", "3d", "time-attack"]);
  });

  it("falls back to legacy genre when structured tags are empty", () => {
    expect(extractGenreTags(GAMES[2] as never)).toEqual(["puzzle"]);
  });
});

describe("sortPublicGames", () => {
  it("sorts by popularity first", () => {
    expect(sortPublicGames(GAMES as never, "popular").map((game) => game.id)).toEqual(["game-1", "game-3", "game-2"]);
  });

  it("ignores featured rank when popularity is requested", () => {
    const rows = [
      { ...GAMES[0], featured_rank: 999, play_count_cached: 30 },
      { ...GAMES[1], featured_rank: 1, play_count_cached: 80 },
    ];
    expect(sortPublicGames(rows as never, "popular").map((game) => game.id)).toEqual(["game-2", "game-1"]);
  });

  it("sorts by newest first", () => {
    expect(sortPublicGames(GAMES as never, "newest").map((game) => game.id)).toEqual(["game-2", "game-1", "game-3"]);
  });
});

describe("filterPublicGames", () => {
  it("filters by search query and genre tag together", () => {
    const rows = filterPublicGames(GAMES as never, { q: "jet", genre: "dogfight" });
    expect(rows.map((game) => game.id)).toEqual(["game-2"]);
  });
});
