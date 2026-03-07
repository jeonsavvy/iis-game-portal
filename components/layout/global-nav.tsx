"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "홈" },
  { href: "/editor", label: "에디터" },
  { href: "/admin", label: "운영실" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function GlobalNav() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[var(--shell-width)] items-center justify-between gap-4 rounded-[1.8rem] border border-white/10 bg-[#0f1016]/80 px-4 py-3 shadow-[var(--shadow-panel)] backdrop-blur-xl sm:px-5">
        <Link href="/" className="group flex min-w-0 items-center gap-3 rounded-full pr-4 transition-opacity hover:opacity-90">
          <Image src="/assets/brand/iis-wordmark.svg" alt="IIS Game Studio" width={140} height={32} className="h-10 w-auto shrink-0" priority />
          <div className="hidden min-w-0 flex-col sm:flex">
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Editorial Arcade</span>
            <span className="truncate text-xs text-muted-foreground">Curated play surface · Studio console</span>
          </div>
        </Link>

        <nav aria-label="주요 탐색" className="flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1">
          {LINKS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Button key={item.href} asChild variant={active ? "default" : "ghost"} size="sm" className={cn("rounded-full px-4", !active && "text-muted-foreground")}>
                <Link href={item.href} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
