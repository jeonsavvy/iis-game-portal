import { describe, expect, it } from "vitest";

import { isSupabaseAuthCookieName } from "@/lib/auth/supabase-cookie";

describe("isSupabaseAuthCookieName", () => {
  it("accepts standard Supabase auth cookies", () => {
    expect(isSupabaseAuthCookieName("sb-abc-auth-token")).toBe(true);
    expect(isSupabaseAuthCookieName("supabase-auth-token")).toBe(true);
    expect(isSupabaseAuthCookieName("sb-access-token")).toBe(true);
  });

  it("accepts chunked auth cookies used for larger OAuth sessions", () => {
    expect(isSupabaseAuthCookieName("sb-abc-auth-token.0")).toBe(true);
    expect(isSupabaseAuthCookieName("sb-abc-auth-token.1")).toBe(true);
  });

  it("rejects unrelated cookies", () => {
    expect(isSupabaseAuthCookieName("sb-abc-code-verifier")).toBe(false);
    expect(isSupabaseAuthCookieName("session")).toBe(false);
  });
});
