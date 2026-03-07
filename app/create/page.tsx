import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STEPS = [
  {
    title: "아이디어 입력",
    description: "장르, 분위기, 조작, 목표를 적으면 AI가 바로 게임 제작 방향을 잡습니다.",
  },
  {
    title: "미리보기 확인",
    description: "작업공간에서 결과를 바로 실행하고 수정 요청을 이어서 보낼 수 있습니다.",
  },
  {
    title: "퍼블리시 준비",
    description: "수정안 적용과 퍼블리시 승인 흐름을 거쳐 공개 가능한 상태로 정리합니다.",
  },
];

export default function CreatePage() {
  return (
    <section className="grid gap-6">
      <Card className="rounded-[1.5rem] border-white/10 bg-[#111118]/92 p-6 sm:p-8 lg:p-10">
        <div className="max-w-4xl space-y-5">
          <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground sm:text-5xl">AI로 게임 만들기</h1>
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            iis는 게임 아이디어를 빠르게 시도하고, 바로 실행해 보고, 수정한 뒤 퍼블리시까지 이어지는 제작 흐름을 제공합니다.
            현재 작업공간은 승인된 제작자와 운영자를 중심으로 제공하고 있습니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/workspace">내 작업공간 열기</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/discover">먼저 게임 둘러보기</Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {STEPS.map((step, index) => (
          <Card key={step.title} className="rounded-[1.25rem] border-white/8 bg-[#111118]/88 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">STEP {index + 1}</p>
            <h2 className="mt-3 text-[1.4rem] font-bold tracking-[-0.04em] text-foreground">{step.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
