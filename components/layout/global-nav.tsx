"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "홈" },
  { href: "/create", label: "게임 만들기" },
  { href: "/admin", label: "운영실" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/play");
  if (href === "/create" && pathname.startsWith("/workspace")) return true;
  return pathname.startsWith(href);
}

export function GlobalNav() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-0 z-50 border-b border-[#1b1337]/10 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[var(--shell-width)] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center text-foreground">
          <span className="inline-flex min-h-12 items-center rounded-full border border-[#1b1337]/12 bg-white/80 px-4 text-2xl font-semibold tracking-[-0.04em] shadow-[0_12px_28px_rgba(27,19,55,0.08)]">
            iis
          </span>
        </Link>

        <nav aria-label="주요 탐색" className="flex items-center gap-2 rounded-full border border-[#1b1337]/10 bg-white/72 p-2 shadow-[0_12px_28px_rgba(27,19,55,0.08)]">
          {LINKS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Button
                key={item.href}
                asChild
                variant={active ? "default" : "ghost"}
                size="sm"
                className={cn("rounded-full px-4 sm:px-5", !active && "text-[#4b4265]")}
              >
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
