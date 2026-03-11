import { describe, expect, it } from "vitest";

import { getAdminLoginIntro, getInitialAdminLoginStatus } from "@/components/AdminLoginForm";

describe("getAdminLoginIntro", () => {
  it("uses approval-first login copy", () => {
    const intro = getAdminLoginIntro("/workspace");

    expect(intro.title).toBe("로그인");
    expect(intro.description).toBe("관리자에게 승인된 이메일 계정만 접속할 수 있습니다.");
    expect(intro.meta).toBeNull();
  });
});

describe("getInitialAdminLoginStatus", () => {
  it("keeps the initial screen empty when the allowlist is not configured", () => {
    expect(getInitialAdminLoginStatus({ allowlistConfigured: false, initialError: null, supabaseConfigError: null })).toBe("");
  });

  it("does not leak raw config errors on the default screen", () => {
    expect(getInitialAdminLoginStatus({ allowlistConfigured: true, initialError: null, supabaseConfigError: "Missing NEXT_PUBLIC_SUPABASE_URL" })).toBe(
      "현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.",
    );
  });
});
