import { describe, expect, it } from "vitest";

import { getAdminLoginErrorMessage, getAdminLoginIntro, getInitialAdminLoginStatus } from "@/components/AdminLoginForm";

describe("getAdminLoginIntro", () => {
  it("uses approval-first Google login copy", () => {
    const intro = getAdminLoginIntro("/workspace");

    expect(intro.title).toBe("로그인");
    expect(intro.description).toBe("승인된 Google 계정은 권한에 따라 게임 만들기 작업공간 또는 운영실에 접근할 수 있습니다.");
    expect(intro.meta).toBeNull();
  });
});

describe("getInitialAdminLoginStatus", () => {
  it("keeps the initial screen empty when no login error is provided", () => {
    expect(getInitialAdminLoginStatus({ initialError: null, supabaseConfigError: null })).toBe("");
  });

  it("surfaces known login errors through normalized copy", () => {
    expect(getInitialAdminLoginStatus({ initialError: "config", supabaseConfigError: null })).toBe("현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.");
  });

  it("shows a generic message when Google login config is unavailable", () => {
    expect(getInitialAdminLoginStatus({ initialError: null, supabaseConfigError: "Missing NEXT_PUBLIC_SUPABASE_URL" })).toBe(
      "현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.",
    );
  });
});

describe("getAdminLoginErrorMessage", () => {
  it("uses an approval-specific rejection message for forbidden accounts", () => {
    expect(getAdminLoginErrorMessage("forbidden")).toBe("승인되지 않은 계정입니다. 관리자 승인 후 다시 시도해주세요.");
  });

  it("uses Google-specific copy for missing OAuth codes", () => {
    expect(getAdminLoginErrorMessage("missing_code")).toBe("Google 로그인 응답을 확인할 수 없습니다. 다시 시도해주세요.");
  });
});
