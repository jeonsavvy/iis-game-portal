import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PlayHeader({ title, summary, debugHref }: { title: string; summary: string; debugHref?: string | null }) {
  return (
    <header className="flex flex-col gap-6 rounded-[1.85rem] border border-white/8 bg-[#111118]/82 p-6 shadow-[var(--shadow-soft)] lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl space-y-4">
        <Badge variant="outline" className="w-fit border-white/12 text-accent">Launch stage</Badge>
        <div className="space-y-3">
          <h1 className="font-display text-4xl leading-none tracking-[-0.05em] text-balance text-foreground sm:text-5xl">{title}</h1>
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">{summary}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="size-4" />
            홈으로
          </Link>
        </Button>
        {debugHref ? (
          <Button asChild>
            <a href={debugHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              디버그: 새 탭 실행
            </a>
          </Button>
        ) : null}
      </div>
    </header>
  );
}
