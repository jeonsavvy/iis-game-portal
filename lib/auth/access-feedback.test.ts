import { describe, expect, it } from "vitest";

import { getAccessDeniedCopy, getLoginRequiredCopy } from "@/lib/auth/access-feedback";

describe("getLoginRequiredCopy", () => {
  it("returns unified login-required copy", () => {
    expect(getLoginRequiredCopy("/admin")).toEqual({
      message: "로그인 후 계속할 수 있습니다.",
      ctaLabel: "로그인하고 계속하기",
      href: "/login?next=%2Fadmin",
    });
  });
});

describe("getAccessDeniedCopy", () => {
  it("returns unified access-denied copy with account context", () => {
    expect(getAccessDeniedCopy("staff@example.com")).toEqual({
      message: "이 계정으로는 이 화면에 접근할 수 없습니다.",
      detail: "현재 계정: staff@example.com",
      primaryCtaLabel: "홈으로 이동",
      primaryHref: "/",
    });
  });
});
