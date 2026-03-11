import { describe, expect, it } from "vitest";

import { getAdminLoginErrorMessage, getAdminLoginIntro, getInitialAdminLoginStatus, validateAdminLoginSubmission } from "@/components/AdminLoginForm";

describe("getAdminLoginIntro", () => {
  it("uses approval-first login copy", () => {
    const intro = getAdminLoginIntro("/workspace");

    expect(intro.title).toBe("로그인");
    expect(intro.description).toBe("관리자에게 승인된 이메일 계정만 접속할 수 있습니다.");
    expect(intro.meta).toBeNull();
  });
});

describe("getInitialAdminLoginStatus", () => {
  it("keeps the initial screen empty when no login error is provided", () => {
    expect(getInitialAdminLoginStatus({ initialError: null })).toBe("");
  });

  it("surfaces known login errors through normalized copy", () => {
    expect(getInitialAdminLoginStatus({ initialError: "config" })).toBe("현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.");
  });
});

describe("getAdminLoginErrorMessage", () => {
  it("uses an approval-specific rejection message for forbidden accounts", () => {
    expect(getAdminLoginErrorMessage("forbidden")).toBe("승인되지 않은 계정입니다. 관리자 승인 후 다시 시도해주세요.");
  });
});

describe("validateAdminLoginSubmission", () => {
  it("requires a non-empty email value", () => {
    expect(validateAdminLoginSubmission({
      normalizedEmail: "",
    })).toBe("이메일을 입력해주세요.");
  });
});
