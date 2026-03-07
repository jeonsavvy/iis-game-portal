import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PRESETS = [
  { title: "레이싱", prompt: "신스웨이브 네온 서킷을 달리는 3D 레이싱 게임" },
  { title: "비행", prompt: "로우폴리 섬과 링을 통과하는 3D 비행 게임" },
  { title: "슈팅", prompt: "탑뷰 슈팅과 대시가 있는 아레나 게임" },
  { title: "퍼즐", prompt: "짧게 즐길 수 있는 브라우저 퍼즐 게임" },
  { title: "액션", prompt: "즉시 시작 가능한 아케이드 액션 게임" },
  { title: "실험작", prompt: "짧고 독특한 규칙을 가진 실험적인 게임" },
];

export default function CreatePage() {
  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-foreground">게임 만들기</h1>
        <p className="mt-2 text-sm text-muted-foreground">원하는 장르를 고르고 바로 작업공간에서 시작하세요.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PRESETS.map((preset) => (
          <Card key={preset.title} className="p-0">
            <form action="/workspace" method="GET" className="grid gap-3 p-5">
              <input type="hidden" name="prompt" value={preset.prompt} />
              <button type="submit" className="grid gap-2 text-left">
                <span className="text-xl font-semibold text-foreground">{preset.title}</span>
                <span className="text-sm leading-6 text-muted-foreground">{preset.prompt}</span>
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
