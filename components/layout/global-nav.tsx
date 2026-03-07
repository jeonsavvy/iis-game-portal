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
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[var(--shell-width)] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-semibold tracking-[-0.03em] text-foreground">
          iis
        </Link>

        <nav aria-label="주요 탐색" className="flex items-center gap-2">
          {LINKS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Button
                key={item.href}
                asChild
                variant={active ? "default" : "ghost"}
                size="sm"
                className={cn("px-4", !active && "text-zinc-600")}
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
