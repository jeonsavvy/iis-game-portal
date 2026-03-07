"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PlayInfoTabs({ controlsHint, overview }: { controlsHint: string[]; overview: string[] }) {
  const controlRows = controlsHint.length > 0 ? controlsHint : ["조작법은 게임 화면 상단 안내를 우선 기준으로 확인하세요."];
  const overviewRows = overview.length > 0 ? overview : ["상단 목표와 조작 안내를 기준으로 핵심 루프를 빠르게 익히세요."];

  return (
    <section className="rounded-[1.85rem] border border-white/8 bg-[#111118]/85 p-6 shadow-[var(--shadow-soft)]">
      <Tabs defaultValue="controls" className="w-full">
        <TabsList aria-label="게임 상세 탭">
          <TabsTrigger value="controls">조작법</TabsTrigger>
          <TabsTrigger value="overview">게임 설명</TabsTrigger>
        </TabsList>
        <TabsContent value="controls">
          <ul className="grid gap-3 text-sm leading-6 text-muted-foreground">
            {controlRows.map((line, index) => (
              <li key={`control-${index}-${line}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">{line}</li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="overview">
          <ul className="grid gap-3 text-sm leading-6 text-muted-foreground">
            {overviewRows.map((line, index) => (
              <li key={`overview-${index}-${line}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">{line}</li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </section>
  );
}
