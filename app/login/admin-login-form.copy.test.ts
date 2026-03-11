import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AdminLoginForm } from "@/components/AdminLoginForm";

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithOtp: vi.fn(),
    },
  }),
}));

describe("AdminLoginForm copy", () => {
  it("shows approval-first email copy without exposing magic-link jargon in the primary UI", () => {
    const html = renderToStaticMarkup(createElement(AdminLoginForm, {
      nextPath: "/workspace",
      allowedEmails: ["admin@example.com"],
    }));

    expect(html).toContain("로그인 이메일");
    expect(html).toContain("로그인 링크 받기");
    expect(html).toContain("관리자에게 승인된 이메일 계정만 접속할 수 있습니다.");
    expect(html).not.toContain("매직링크");
  });
});
