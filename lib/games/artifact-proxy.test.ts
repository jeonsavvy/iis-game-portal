import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { proxyArtifactResponse, resolveArtifactTarget } from "./artifact-proxy";

const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);

function setNodeEnv(value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) {
    delete env.NODE_ENV;
    return;
  }
  env.NODE_ENV = value;
}

function createSupabaseWithGame(game: { url: string } | null, error: { message: string } | null = null) {
  const single = vi.fn().mockResolvedValue({ data: game, error });
  const secondEq = vi.fn().mockReturnValue({ single });
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
  const select = vi.fn().mockReturnValue({ eq: firstEq });
  const from = vi.fn().mockReturnValue({ select });
  return { from };
}

describe("resolveArtifactTarget", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetAllMocks();
    setNodeEnv(originalNodeEnv);
  });

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
  });

  it("returns 400 for path traversal attempts", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(
      createSupabaseWithGame({ url: "https://cdn.example.com/game/index.html" }) as never,
    );

    const result = await resolveArtifactTarget("game-1", "../secret.js");

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
    await expect((result as Response).json()).resolves.toMatchObject({
      error: "Invalid artifact path",
      code: "invalid_artifact_path",
    });
  });

  it("returns 404 when game metadata is unavailable", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(createSupabaseWithGame(null) as never);

    const result = await resolveArtifactTarget("missing-game", "index.html");

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(404);
    await expect((result as Response).json()).resolves.toMatchObject({
      error: "Game not found",
      code: "game_not_found",
    });
  });

  it("builds target URL relative to entrypoint directory", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(
      createSupabaseWithGame({ url: "https://cdn.example.com/games/neon/index.html?token=secret" }) as never,
    );

    const result = await resolveArtifactTarget("game-2", "assets/main.js");

    expect(result).not.toBeInstanceOf(Response);
    expect(result).toMatchObject({
      upstreamUrl: "https://cdn.example.com/games/neon/assets/main.js",
      contentTypeHint: "application/javascript; charset=utf-8",
    });
  });

  it("rejects private/localhost artifact sources", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(
      createSupabaseWithGame({ url: "https://127.0.0.1/games/neon/index.html" }) as never,
    );

    const result = await resolveArtifactTarget("game-local", "index.html");

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    await expect((result as Response).json()).resolves.toMatchObject({
      error: "Artifact source is not allowed",
      code: "artifact_source_not_allowed",
    });
  });

  it("rejects non-https artifact sources in production", async () => {
    setNodeEnv("production");
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(
      createSupabaseWithGame({ url: "http://cdn.example.com/games/neon/index.html" }) as never,
    );

    const result = await resolveArtifactTarget("game-http", "index.html");

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it("allows http artifact sources outside production for local preview", async () => {
    setNodeEnv("development");
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(
      createSupabaseWithGame({ url: "http://cdn.example.com/games/neon/index.html" }) as never,
    );

    const result = await resolveArtifactTarget("game-http-dev", "index.html");

    expect(result).not.toBeInstanceOf(Response);
    expect(result).toMatchObject({
      upstreamUrl: "http://cdn.example.com/games/neon/index.html",
      contentTypeHint: "text/html; charset=utf-8",
    });
  });
});

describe("proxyArtifactResponse", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("uses content-type hint for generic upstream responses", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("console.log('ok')", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      }),
    ) as typeof fetch;

    const response = await proxyArtifactResponse({
      game: {} as never,
      upstreamUrl: "https://cdn.example.com/games/neon/main.js",
      contentTypeHint: "application/javascript; charset=utf-8",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/javascript; charset=utf-8");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cross-origin-resource-policy")).toBe("cross-origin");
    expect(response.headers.get("x-iis-artifact-proxy")).toBe("1");
    expect(response.headers.has("x-iis-artifact-source")).toBe(false);
  });

  it("follows safe redirects for artifact responses", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://cdn.example.com/games/neon/main.js?v=2" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("console.log('ok')", {
          status: 200,
          headers: { "content-type": "application/javascript; charset=utf-8" },
        }),
      ) as typeof fetch;

    const response = await proxyArtifactResponse({
      game: {} as never,
      upstreamUrl: "https://cdn.example.com/games/neon/main.js",
      contentTypeHint: "application/javascript; charset=utf-8",
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2);
  });

  it("blocks redirects that target private hosts", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/internal.js" },
        }),
      ) as typeof fetch;

    const response = await proxyArtifactResponse({
      game: {} as never,
      upstreamUrl: "https://cdn.example.com/games/neon/main.js",
      contentTypeHint: "application/javascript; charset=utf-8",
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "artifact_redirect_not_allowed",
    });
  });

  it("returns 502 when redirect response has no location header", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
        }),
      ) as typeof fetch;

    const response = await proxyArtifactResponse({
      game: {} as never,
      upstreamUrl: "https://cdn.example.com/games/neon/main.js",
      contentTypeHint: "application/javascript; charset=utf-8",
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "artifact_redirect_missing_location",
    });
  });

  it("returns 502 when redirect chain exceeds hop limit", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "https://cdn.example.com/games/neon/main.js?next=1" },
        }),
      ) as typeof fetch;

    const response = await proxyArtifactResponse({
      game: {} as never,
      upstreamUrl: "https://cdn.example.com/games/neon/main.js",
      contentTypeHint: "application/javascript; charset=utf-8",
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "artifact_redirect_limit_exceeded",
    });
  });

  it("returns sanitized 502 error when upstream fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:443")) as typeof fetch;

    const response = await proxyArtifactResponse({
      game: {} as never,
      upstreamUrl: "https://cdn.example.com/games/neon/main.js",
      contentTypeHint: "application/javascript; charset=utf-8",
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "artifact_fetch_failed",
      detail: "artifact_fetch_failed",
      code: "artifact_fetch_failed",
    });
  });
});
