"use client";

import { type FormEvent, useMemo, useState } from "react";

import { AdminLoginPanel } from "@/components/auth/admin-login-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AdminLoginFormProps = {
  nextPath: string;
  allowedEmails: string[];
  initialError?: string | null;
};

type AdminLoginStatusArgs = {
  allowlistConfigured: boolean;
  initialError?: string | null;
  supabaseConfigError?: string | null;
};

function buildCallbackUrl(nextPath: string): string {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", nextPath);
  return url.toString();
}

function getErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "forbidden":
      return "이 계정으로는 로그인할 수 없습니다.";
    case "missing_code":
      return "인증 코드가 누락되었습니다. 메일 링크를 다시 열어주세요.";
    case "exchange_failed":
      return "로그인 처리에 실패했습니다. 매직링크를 다시 요청해주세요.";
    case "config":
      return "현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.";
    default:
      return "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
  }
}

export function getAdminLoginIntro(_nextPath: string): { title: string; description: string; meta: null } {
  return {
    title: "로그인",
    description: "이메일로 받은 매직링크로 계속 진행하세요.",
    meta: null,
  };
}

export function getInitialAdminLoginStatus({ allowlistConfigured, initialError, supabaseConfigError }: AdminLoginStatusArgs): string {
  if (initialError) {
    return getErrorMessage(initialError) ?? "";
  }
  if (supabaseConfigError || !allowlistConfigured) {
    return supabaseConfigError ? "현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요." : "";
  }
  return "";
}

export function AdminLoginForm({ nextPath, allowedEmails, initialError }: AdminLoginFormProps) {
  const allowlistConfigured = allowedEmails.length > 0;
  const [supabaseConfigError] = useState<string | null>(() => {
    try {
      createSupabaseBrowserClient();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "unknown_error";
    }
  });

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const intro = getAdminLoginIntro(nextPath);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>(getInitialAdminLoginStatus({ allowlistConfigured, initialError, supabaseConfigError }));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!allowlistConfigured) {
      setStatus("현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    if (!normalizedEmail) {
      setStatus("이메일을 입력해주세요.");
      return;
    }
    if (!allowedEmails.includes(normalizedEmail)) {
      setStatus("이 계정으로는 로그인할 수 없습니다.");
      return;
    }
    if (!supabase) {
      setStatus("현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setSubmitting(true);
    setStatus("매직링크 전송 중...");

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: buildCallbackUrl(nextPath) },
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
    <AdminLoginPanel
      title={intro.title}
      description={intro.description}
      meta={intro.meta}
    >
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-2 text-sm text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">로그인 이메일</span>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={submitting}>{submitting ? "전송 중..." : "매직링크 보내기"}</Button>
        </div>
      </form>
      {status ? <p className="mt-4 rounded-[1rem] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-muted-foreground">{status}</p> : null}
    </AdminLoginPanel>
  );
}
