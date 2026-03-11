"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/SignOutButton";

type NavAccountPayload = {
  authenticated: boolean;
  email: string | null;
  role: string | null;
  canAccessWorkspace: boolean;
  canAccessAdmin: boolean;
};

type LoadState = "loading" | "ready";

function formatRole(role: string | null): string | null {
  if (!role) return null;
  if (role === "master_admin") return "master admin";
  if (role === "creator") return "creator";
  return role;
}

export function NavAccount() {
  const pathname = usePathname() ?? "/";
  const [state, setState] = useState<LoadState>("loading");
  const [account, setAccount] = useState<NavAccountPayload | null>(null);

  const nextPath = useMemo(() => pathname, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const payload = await response.json().catch(() => null) as NavAccountPayload | null;
        if (!cancelled) {
          setAccount(payload);
          setState("ready");
        }
      } catch {
        if (!cancelled) {
          setAccount(null);
          setState("ready");
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (state === "loading") {
    return <div className="h-11 w-[11rem] rounded-full border border-[#1b1337]/8 bg-white/55" aria-hidden="true" />;
  }

  if (!account?.authenticated) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>로그인</Link>
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex min-w-0 flex-col items-end">
        <span className="max-w-[14rem] truncate text-sm font-medium text-foreground">{account.email}</span>
        {account.role ? <Badge variant="outline" className="mt-1">{formatRole(account.role)}</Badge> : null}
      </div>
      <SignOutButton size="sm" redirectTo="/" />
    </div>
  );
}
