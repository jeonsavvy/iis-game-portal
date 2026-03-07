import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GET } from "./route";

const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);

function createSupabaseMock({
  game,
  leaderboard,
}: {
  game: { id: string; slug: string } | null;
  leaderboard: Array<{ id: number; player_name: string; score: number; created_at: string }>;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "games_metadata") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: game, error: null }),
            }),
          }),
        };
      }

      if (table === "leaderboard") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: leaderboard, error: null }),
                }),
              }),
            }),
          }),
        };
      }

      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

describe("GET /api/games/[id]/leaderboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 404 when the game does not exist", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(
      createSupabaseMock({ game: null, leaderboard: [] }) as never,
    );

    const response = await GET(new Request("https://portal.example.com/api/games/neon-drift/leaderboard"), {
      params: Promise.resolve({ id: "neon-drift" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: "game_not_found",
    });
  });

  it("returns normalized leaderboard rows for a public detail page", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(
      createSupabaseMock({
        game: { id: "game-1", slug: "neon-drift" },
        leaderboard: [
          { id: 1, player_name: "AAA", score: 1200, created_at: "2026-03-07T12:00:00.000Z" },
          { id: 2, player_name: "BBB", score: 900, created_at: "2026-03-07T11:00:00.000Z" },
        ],
      }) as never,
    );

    const response = await GET(new Request("https://portal.example.com/api/games/neon-drift/leaderboard?limit=5"), {
      params: Promise.resolve({ id: "neon-drift" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      gameId: "game-1",
      slug: "neon-drift",
      leaderboard: [
        { rank: 1, id: 1, playerName: "AAA", score: 1200, createdAt: "2026-03-07T12:00:00.000Z" },
        { rank: 2, id: 2, playerName: "BBB", score: 900, createdAt: "2026-03-07T11:00:00.000Z" },
      ],
    });
  });
});
