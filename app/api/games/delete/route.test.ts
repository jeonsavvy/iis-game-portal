import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/admin-guard", () => ({
  withAdminGuard: vi.fn(),
}));

vi.mock("@/lib/api/core-engine-proxy", () => ({
  forwardToCoreEngine: vi.fn(),
}));

import { withAdminGuard } from "@/lib/api/admin-guard";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { POST } from "./route";

const mockedWithAdminGuard = vi.mocked(withAdminGuard);
const mockedForwardToCoreEngine = vi.mocked(forwardToCoreEngine);

function createAuthContext(game: { id: string; slug: string } | null) {
  return {
    userId: "user-1",
    role: "master_admin",
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: game }),
          }),
        }),
      }),
    },
  };
}

describe("POST /api/games/delete", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 404 when game is missing", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce(createAuthContext(null) as never);
    const request = new Request("https://portal.example.com/api/games/delete", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://portal.example.com" },
      body: JSON.stringify({ gameId: "game-1", confirmSlug: "arcade-hero" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    expect(mockedWithAdminGuard).toHaveBeenCalledWith("session:write", { request });
    await expect(response.json()).resolves.toMatchObject({
      code: "game_not_found",
    });
    expect(mockedForwardToCoreEngine).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is invalid json", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce(createAuthContext({ id: "game-1", slug: "arcade-hero" }) as never);

    const response = await POST(
      new Request("https://portal.example.com/api/games/delete", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: '{"gameId"',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "invalid_json_body",
    });
    expect(mockedForwardToCoreEngine).not.toHaveBeenCalled();
  });

  it("returns 400 when slug confirmation mismatches", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce(createAuthContext({ id: "game-1", slug: "actual-slug" }) as never);

    const response = await POST(
      new Request("https://portal.example.com/api/games/delete", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ gameId: "game-1", confirmSlug: "wrong-slug" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "slug_mismatch",
    });
    expect(mockedForwardToCoreEngine).not.toHaveBeenCalled();
  });

  it("forwards delete request when confirmation matches", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce(createAuthContext({ id: "game-1", slug: "arcade-hero" }) as never);
    mockedForwardToCoreEngine.mockResolvedValueOnce(NextResponse.json({ ok: true }, { status: 200 }));

    const response = await POST(
      new Request("https://portal.example.com/api/games/delete", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ gameId: "game-1", confirmSlug: "arcade-hero" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedForwardToCoreEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/v1/games/game-1",
        method: "DELETE",
        retries: 1,
        body: {
          delete_storage: true,
          delete_archive: true,
          reason: "admin_manual_delete",
        },
      }),
    );
  });

  it("returns normalized 502 when unexpected exception occurs", async () => {
    mockedWithAdminGuard.mockRejectedValueOnce(new Error("supabase boot failed"));

    const response = await POST(
      new Request("https://portal.example.com/api/games/delete", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ gameId: "game-1", confirmSlug: "arcade-hero" }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Core engine unavailable",
      detail: "supabase boot failed",
      code: "core_engine_unavailable",
    });
    expect(mockedForwardToCoreEngine).not.toHaveBeenCalled();
  });

  it("passes through core conflict response", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce(createAuthContext({ id: "game-1", slug: "arcade-hero" }) as never);
    mockedForwardToCoreEngine.mockResolvedValueOnce(
      NextResponse.json(
        {
          error: "delete_conflict",
          detail: { game_id: "game-1", reason: "pipeline_running" },
          code: "delete_conflict",
        },
        { status: 409 },
      ),
    );

    const response = await POST(
      new Request("https://portal.example.com/api/games/delete", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ gameId: "game-1", confirmSlug: "arcade-hero" }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "delete_conflict",
      detail: { game_id: "game-1", reason: "pipeline_running" },
      code: "delete_conflict",
    });
  });

  it("passes through core not-found response", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce(createAuthContext({ id: "game-1", slug: "arcade-hero" }) as never);
    mockedForwardToCoreEngine.mockResolvedValueOnce(
      NextResponse.json(
        {
          error: "Game not found",
          detail: "Game not found",
        },
        { status: 404 },
      ),
    );

    const response = await POST(
      new Request("https://portal.example.com/api/games/delete", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({ gameId: "game-1", confirmSlug: "arcade-hero" }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Game not found",
      detail: "Game not found",
    });
  });
});
