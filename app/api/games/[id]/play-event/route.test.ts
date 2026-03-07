import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

const mockedCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);

function createAdminMock({
  game,
  totalEvents,
}: {
  game: { id: string; slug: string; play_count_cached?: number | null } | null;
  totalEvents: number;
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
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }

      if (table === "game_play_events") {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          select: vi.fn((_columns: string, options?: { count?: string; head?: boolean }) => {
            expect(options).toMatchObject({ count: "exact", head: true });
            return {
              eq: vi.fn().mockResolvedValue({ count: totalEvents, error: null }),
            };
          }),
        };
      }

      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

describe("POST /api/games/[id]/play-event", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 404 when game is missing", async () => {
    mockedCreateSupabaseAdminClient.mockReturnValueOnce(
      createAdminMock({ game: null, totalEvents: 0 }) as never,
    );

    const response = await POST(
      new Request("https://portal.example.com/api/games/neon-drift/play-event", { method: "POST" }),
      { params: Promise.resolve({ id: "neon-drift" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: "game_not_found",
    });
  });

  it("records a play event and returns updated cached count", async () => {
    mockedCreateSupabaseAdminClient.mockReturnValueOnce(
      createAdminMock({
        game: { id: "game-1", slug: "neon-drift", play_count_cached: 12 },
        totalEvents: 13,
      }) as never,
    );

    const response = await POST(
      new Request("https://portal.example.com/api/games/neon-drift/play-event", {
        method: "POST",
        headers: {
          "user-agent": "Vitest Browser",
          "x-forwarded-for": "203.0.113.9",
        },
      }),
      { params: Promise.resolve({ id: "neon-drift" }) },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      gameId: "game-1",
      slug: "neon-drift",
      playCount: 13,
    });
  });
});
