import Link from "next/link";
import { Crosshair, Flag, Plane, Puzzle, Sparkles, Swords } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PRESETS = [
  { title: "레이싱", summary: "네온 서킷 레이싱", prompt: "신스웨이브 네온 서킷을 달리는 3D 레이싱 게임", Icon: Flag },
  { title: "비행", summary: "섬과 링을 가르는 비행", prompt: "로우폴리 섬과 링을 통과하는 3D 비행 게임", Icon: Plane },
  { title: "슈팅", summary: "탑뷰 아레나 슈팅", prompt: "탑뷰 슈팅과 대시가 있는 아레나 게임", Icon: Crosshair },
  { title: "퍼즐", summary: "짧고 선명한 퍼즐", prompt: "짧게 즐길 수 있는 브라우저 퍼즐 게임", Icon: Puzzle },
  { title: "액션", summary: "즉시 시작 액션", prompt: "즉시 시작 가능한 아케이드 액션 게임", Icon: Swords },
  { title: "실험작", summary: "짧고 이상한 규칙", prompt: "짧고 독특한 규칙을 가진 실험적인 게임", Icon: Sparkles },
];

export default function CreatePage() {
  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-foreground">게임 만들기</h1>
        <p className="mt-2 text-sm text-muted-foreground">바로 시작할 장르를 선택하세요.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PRESETS.map(({ Icon, ...preset }) => (
          <Card key={preset.title} className="p-0 transition-colors hover:border-[#1b1337]/14 hover:bg-white/90">
            <form action="/workspace" method="GET" className="grid gap-3 p-5">
              <input type="hidden" name="prompt" value={preset.prompt} />
              <button type="submit" aria-label={preset.title} className="grid gap-4 text-left">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[#fff1dd] text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="grid gap-1">
                  <span className="text-xl font-semibold text-foreground">{preset.title}</span>
                  <span className="text-sm leading-6 text-muted-foreground">{preset.summary}</span>
                </span>
              </button>
            </form>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/workspace">내 작업공간 열기</Link>
        </Button>
      </div>
    </section>
  );
}
