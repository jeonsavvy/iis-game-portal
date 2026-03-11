import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from "@supabase/ssr";
import { GET } from "./route";

const mockedCreateServerClient = vi.mocked(createServerClient);

function createCallbackSupabase(role: "creator" | "master_admin" | null) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: { id: "user-1", email: "staff@example.com" },
        },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: role ? { role } : null,
          }),
        }),
      }),
    })),
  };
}

describe("GET /auth/callback", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.com";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  afterAll(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    }
    if (originalAnon === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    }
  });

  it("redirects approved staff users to the requested next path", async () => {
    mockedCreateServerClient.mockReturnValueOnce(createCallbackSupabase("creator") as never);

    const response = await GET(new NextRequest("https://portal.example.com/auth/callback?code=abc&next=/workspace"));

    expect(response.headers.get("location")).toBe("https://portal.example.com/workspace");
  });

  it("signs out and rejects users without an approved staff role", async () => {
    const supabase = createCallbackSupabase(null);
    mockedCreateServerClient.mockReturnValueOnce(supabase as never);

    const response = await GET(new NextRequest("https://portal.example.com/auth/callback?code=abc&next=/admin"));

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://portal.example.com/login?error=forbidden");
  });
});
