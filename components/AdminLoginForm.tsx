"use client";

import React, { useMemo, useState } from "react";

import { AdminLoginPanel } from "@/components/auth/admin-login-panel";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AdminLoginFormProps = {
  nextPath: string;
  initialError?: string | null;
};

type AdminLoginStatusArgs = {
  initialError?: string | null;
  supabaseConfigError?: string | null;
};

export function getAdminLoginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "forbidden":
      return "승인되지 않은 계정입니다. 관리자 승인 후 다시 시도해주세요.";
    case "missing_code":
      return "Google 로그인 응답을 확인할 수 없습니다. 다시 시도해주세요.";
    case "exchange_failed":
      return "Google 로그인 처리에 실패했습니다. 다시 시도해주세요.";
    case "config":
      return "현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.";
    default:
      return "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
  }
}

export function getAdminLoginIntro(_nextPath: string): { title: string; description: string; meta: null } {
  return {
    title: "로그인",
    description: "승인된 Google 계정은 권한에 따라 게임 만들기 작업공간 또는 운영실에 접근할 수 있습니다.",
    meta: null,
  };
}

export function getInitialAdminLoginStatus({ initialError, supabaseConfigError }: AdminLoginStatusArgs): string {
  if (initialError) {
    return getAdminLoginErrorMessage(initialError) ?? "";
  }
  if (supabaseConfigError) {
    return "현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.";
  }
  return "";
}

export function buildGoogleCallbackUrl(nextPath: string, origin: string): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", nextPath);
  return url.toString();
}

export function AdminLoginForm({ nextPath, initialError }: AdminLoginFormProps) {
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
  const [status, setStatus] = useState<string>(getInitialAdminLoginStatus({ initialError, supabaseConfigError }));
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setStatus("현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setSubmitting(true);
    setStatus("Google 로그인으로 이동 중...");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildGoogleCallbackUrl(nextPath, window.location.origin),
        },
      });

      if (error) {
        setStatus(error.message || "현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.");
        setSubmitting(false);
      }
    } catch {
      setStatus("현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.");
      setSubmitting(false);
    }
  };

  return (
    <AdminLoginPanel
      title={intro.title}
      description={intro.description}
      meta={intro.meta}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" disabled={submitting} onClick={handleGoogleLogin}>
          {submitting ? "이동 중..." : "Google로 로그인"}
        </Button>
      </div>
      {status ? <p className="mt-4 rounded-[1rem] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-muted-foreground">{status}</p> : null}
    </AdminLoginPanel>
  );
}
