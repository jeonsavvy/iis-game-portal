"use client";

import React, { type FormEvent, useState } from "react";

import { AdminLoginPanel } from "@/components/auth/admin-login-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminLoginFormProps = {
  nextPath: string;
  initialError?: string | null;
};

type AdminLoginStatusArgs = {
  initialError?: string | null;
};

type AdminLoginSubmitValidationArgs = {
  normalizedEmail: string;
};

export function getAdminLoginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "forbidden":
      return "승인되지 않은 계정입니다. 관리자 승인 후 다시 시도해주세요.";
    case "missing_code":
      return "인증 코드가 누락되었습니다. 메일 링크를 다시 열어주세요.";
    case "exchange_failed":
      return "로그인 처리에 실패했습니다. 로그인 링크를 다시 요청해주세요.";
    case "config":
      return "현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.";
    default:
      return "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
  }
}

export function getAdminLoginIntro(_nextPath: string): { title: string; description: string; meta: null } {
  return {
    title: "로그인",
    description: "관리자에게 승인된 이메일 계정만 접속할 수 있습니다.",
    meta: null,
  };
}

export function getInitialAdminLoginStatus({ initialError }: AdminLoginStatusArgs): string {
  if (initialError) {
    return getAdminLoginErrorMessage(initialError) ?? "";
  }
  return "";
}

export function validateAdminLoginSubmission({
  normalizedEmail,
}: AdminLoginSubmitValidationArgs): string | null {
  if (!normalizedEmail) {
    return "이메일을 입력해주세요.";
  }
  return null;
}

export function AdminLoginForm({ nextPath, initialError }: AdminLoginFormProps) {
  const intro = getAdminLoginIntro(nextPath);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>(getInitialAdminLoginStatus({ initialError }));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const validationMessage = validateAdminLoginSubmission({
      normalizedEmail,
    });
    if (validationMessage) {
      setStatus(validationMessage);
      return;
    }

    setSubmitting(true);
    setStatus("승인 상태 확인 중...");

    try {
      const response = await fetch("/api/auth/login-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          nextPath,
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; code?: string } | null;

      if (!response.ok) {
        setStatus(getAdminLoginErrorMessage(payload?.code) ?? payload?.error ?? "현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      setStatus("로그인 링크를 이메일로 보냈습니다. 메일에서 링크를 열어 계속 진행해주세요.");
    } catch {
      setStatus("현재 로그인할 수 없습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
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
          <Button type="submit" size="lg" disabled={submitting}>{submitting ? "전송 중..." : "로그인 링크 받기"}</Button>
        </div>
      </form>
      {status ? <p className="mt-4 rounded-[1rem] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-muted-foreground">{status}</p> : null}
    </AdminLoginPanel>
  );
}
