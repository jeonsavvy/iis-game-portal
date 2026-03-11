import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminLoginForm } from "@/components/AdminLoginForm";

describe("AdminLoginForm copy", () => {
  it("shows approval-first email copy without exposing magic-link jargon in the primary UI", () => {
    const html = renderToStaticMarkup(createElement(AdminLoginForm, {
      nextPath: "/workspace",
    }));

    expect(html).toContain("로그인 이메일");
    expect(html).toContain("로그인 링크 받기");
    expect(html).toContain("관리자에게 승인된 이메일 계정만 접속할 수 있습니다.");
    expect(html).not.toContain("매직링크");
  });
});
