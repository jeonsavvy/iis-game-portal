import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseKeepaliveHeaders,
  resolveSupabaseKeepaliveEnv,
  resolveSupabaseKeepaliveUrl,
  runSupabaseKeepalive,
  type SupabaseKeepaliveEnv,
} from "@/lib/cloudflare/supabase-keepalive";

const baseEnv: SupabaseKeepaliveEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://demo-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

describe("resolveSupabaseKeepaliveUrl", () => {
  it("uses the default public metadata query", () => {
    expect(resolveSupabaseKeepaliveUrl(baseEnv)).toBe(
      "https://demo-project.supabase.co/rest/v1/games_metadata?status=eq.active&select=id&limit=1",
    );
  });

  it("allows overriding the keepalive path", () => {
    expect(
      resolveSupabaseKeepaliveUrl({
        ...baseEnv,
        SUPABASE_KEEPALIVE_PATH: "/rest/v1/leaderboard?select=id&limit=1",
      }),
    ).toBe("https://demo-project.supabase.co/rest/v1/leaderboard?select=id&limit=1");
  });

});

describe("resolveSupabaseKeepaliveEnv", () => {
  it("falls back to generated build-time env values when runtime bindings are absent", () => {
    expect(
      resolveSupabaseKeepaliveEnv(
        { NEXTJS_ENV: "production" },
        {
          production: {
            NEXT_PUBLIC_SUPABASE_URL: "https://compiled.supabase.co",
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "compiled-anon",
          },
        },
      ),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://compiled.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "compiled-anon",
      SUPABASE_KEEPALIVE_PATH: undefined,
      NEXTJS_ENV: "production",
    });
  });
});

describe("createSupabaseKeepaliveHeaders", () => {
  it("builds the auth headers from the anon key", () => {
    const headers = createSupabaseKeepaliveHeaders(baseEnv);

    expect(headers.get("apikey")).toBe("anon-key");
    expect(headers.get("authorization")).toBe("Bearer anon-key");
    expect(headers.get("cache-control")).toBe("no-store, max-age=0");
  });
});

describe("runSupabaseKeepalive", () => {
  it("performs a read-only GET against Supabase", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));

    const result = await runSupabaseKeepalive(baseEnv, { fetchImpl, cacheBuster: 42 });

    expect(result).toEqual({
      status: 200,
      url: "https://demo-project.supabase.co/rest/v1/games_metadata?status=eq.active&select=id&limit=1",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://demo-project.supabase.co/rest/v1/games_metadata?status=eq.active&select=id&limit=1",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
        signal: expect.any(AbortSignal),
      }),
    );
    const headers = fetchImpl.mock.calls[0]?.[1]?.headers;
    expect(headers.get("x-iis-keepalive-at")).toBe("42");
    expect(headers.get("user-agent")).toBe("iis-game-portal-supabase-keepalive/1.1");
  });

  it("surfaces response details when Supabase rejects the request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "forbidden" }), {
        status: 403,
        statusText: "Forbidden",
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(runSupabaseKeepalive(baseEnv, { fetchImpl })).rejects.toThrow(
      'Supabase keepalive failed (403 Forbidden): {"message":"forbidden"}',
    );
  });
});
