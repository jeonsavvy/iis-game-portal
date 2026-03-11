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
    expect(html).toContain("작업공간과 운영실은 관리자에게 승인된 Google 계정으로만 접속할 수 있습니다.");
    expect(html).not.toContain("로그인 이메일");
    expect(html).not.toContain("로그인 링크 받기");
    expect(html).not.toContain("매직링크");
  });
});
