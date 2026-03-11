import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminLoginForm } from "@/components/AdminLoginForm";

describe("AdminLoginForm copy", () => {
  it("shows approval-first Google login copy without email-link UI", () => {
    const html = renderToStaticMarkup(createElement(AdminLoginForm, {
      nextPath: "/workspace",
    }));

    expect(html).toContain("Google로 로그인");
    expect(html).toContain("승인된 Google 계정은 권한에 따라 게임 만들기 작업공간 또는 운영실에 접근할 수 있습니다.");
    expect(html).not.toContain("로그인 이메일");
    expect(html).not.toContain("로그인 링크 받기");
    expect(html).not.toContain("매직링크");
  });
});
