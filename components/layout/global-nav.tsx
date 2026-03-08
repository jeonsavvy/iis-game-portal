"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <header className="sticky top-0 z-50 border-b border-[#1b1337]/8 bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-[var(--shell-width)] flex-wrap items-center gap-x-9 gap-y-3 px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="text-[2rem] font-semibold tracking-[-0.05em] text-foreground">
          iis
        </Link>

        <nav aria-label="주요 탐색" className="flex flex-wrap items-center gap-x-7 gap-y-2">
          {LINKS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b-2 border-transparent pb-1 text-[0.98rem] font-medium tracking-[-0.01em] text-[#5d5476] transition-colors hover:text-foreground",
                  active && "border-primary text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
