"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database";

type GameRow = Database["public"]["Tables"]["games_metadata"]["Row"];

export function HomeHero({
  game,
  previewMode,
  count,
  backgroundImage,
}: {
  game: GameRow | null;
  previewMode: boolean;
  count: number;
  backgroundImage?: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const title = game?.name ?? "지금 플레이할 게임을 선택하세요";
  const summary = game?.marketing_summary?.trim() || game?.ai_review?.split("\n")[0] || "브라우저에서 즉시 실행 가능한 라이브 게임을 큐레이션합니다.";

  return (
    <motion.section
      initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111118]/90 p-6 shadow-[var(--shadow-panel)] sm:p-8 lg:p-10"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#b4935e]/12 via-transparent to-[#33489c]/14" aria-hidden="true" />
      {backgroundImage ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30 mix-blend-screen"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.74)), url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
      ) : null}
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,22rem)] lg:items-end">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="border-white/14 bg-white/[0.03] text-accent">Editorial Arcade</Badge>
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">큐레이션된 라이브 셀렉션</span>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-display text-4xl leading-none tracking-[-0.06em] text-balance text-foreground sm:text-5xl lg:text-[5.2rem]">{title}</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{summary}</p>
            </div>
          </div>

          {previewMode ? <p className="text-sm text-muted-foreground">프리뷰 모드: 샘플 데이터로 화면을 검수 중입니다.</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            {game ? (
              <Button asChild size="lg">
                <Link href={`/play/${game.slug}`}>지금 플레이</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="lg">
              <Link href="#discover">게임 탐색</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground">
          <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Live games</p>
            <strong className="mt-3 block font-display text-4xl text-foreground">{count}</strong>
          </div>
          <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5 leading-6">
            최신 퍼블리시 게임을 먼저 보여주고, 검색과 정렬은 바로 이어지는 에디토리얼 카탈로그 위에 배치합니다.
          </div>
        </div>
      </div>
    </motion.section>
  );
}
