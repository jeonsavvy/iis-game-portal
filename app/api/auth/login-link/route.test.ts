import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

const mockedCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);
const mockedCreateClient = vi.mocked(createClient);

function createAdminMock(role: "creator" | "master_admin" | null) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe("profiles");
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: role ? { role } : null,
              error: null,
            }),
          }),
        }),
      };
    }),
  };
}

describe("POST /api/auth/login-link", () => {
  const signInWithOtp = vi.fn();
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.com";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    mockedCreateClient.mockReturnValue({
      auth: {
        signInWithOtp,
      },
    } as never);
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

  it("rejects emails without an approved staff profile", async () => {
    mockedCreateSupabaseAdminClient.mockReturnValueOnce(createAdminMock(null) as never);

    const response = await POST(new Request("https://portal.example.com/api/auth/login-link", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://portal.example.com",
      },
      body: JSON.stringify({ email: "blocked@example.com", nextPath: "/workspace" }),
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "forbidden",
    });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("sends a login link when the email belongs to an approved staff profile", async () => {
    signInWithOtp.mockResolvedValueOnce({ error: null });
    mockedCreateSupabaseAdminClient.mockReturnValueOnce(createAdminMock("master_admin") as never);

    const response = await POST(new Request("https://portal.example.com/api/auth/login-link", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://portal.example.com",
      },
      body: JSON.stringify({ email: "Admin@Example.com", nextPath: "/admin" }),
    }));

    expect(response.status).toBe(200);
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "admin@example.com",
      options: {
        emailRedirectTo: "https://portal.example.com/auth/callback?next=%2Fadmin",
      },
    });
  });
});
