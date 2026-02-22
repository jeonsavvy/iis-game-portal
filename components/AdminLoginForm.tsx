"use client";

import { FormEvent, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AdminLoginFormProps = {
  nextPath: string;
  allowedEmails: string[];
  initialError?: string | null;
};

function buildCallbackUrl(nextPath: string): string {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", nextPath);
  return url.toString();
}

function getErrorMessage(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  switch (code) {
    case "forbidden":
      return "허용된 관리자 이메일만 Studio Console에 로그인할 수 있습니다.";
    case "missing_code":
      return "인증 코드가 누락되었습니다. 메일 링크를 다시 열어주세요.";
    case "exchange_failed":
      return "로그인 처리에 실패했습니다. 매직링크를 다시 요청해주세요.";
    case "config":
      return "로그인 설정이 비어 있습니다. 환경변수를 확인해주세요.";
    default:
      return "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
  }
}

export function AdminLoginForm({ nextPath, allowedEmails, initialError }: AdminLoginFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState(allowedEmails[0] ?? "");
  const [status, setStatus] = useState<string>(getErrorMessage(initialError) ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setStatus("이메일을 입력해주세요.");
      return;
    }

    if (!allowedEmails.includes(normalizedEmail)) {
      setStatus("허용된 관리자 이메일만 로그인할 수 있습니다.");
      return;
    }

    setSubmitting(true);
    setStatus("매직링크 전송 중...");

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: buildCallbackUrl(nextPath),
      },
    });

    if (error) {
      setStatus(`전송 실패: ${error.message}`);
      setSubmitting(false);
      return;
    }

    setStatus("매직링크를 이메일로 보냈습니다. 메일에서 링크를 열어 로그인해주세요.");
    setSubmitting(false);
  };

  return (
    <section className="card" style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0 }}>스튜디오 콘솔 로그인</h1>
      <p style={{ margin: 0, color: "#94a3b8" }}>
        관리자 이메일만 로그인 가능합니다. 매직링크로 세션을 발급한 뒤 Studio Console로 이동합니다.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "grid", gap: 4 }}>
          관리자 이메일
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jeonsavvy@gmail.com"
            autoComplete="email"
            required
          />
        </label>
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? "전송 중..." : "매직링크 보내기"}
        </button>
      </form>
      {status ? <p style={{ margin: 0 }}>{status}</p> : null}
      <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>로그인 후 이동 경로: {nextPath}</p>
    </section>
  );
}
