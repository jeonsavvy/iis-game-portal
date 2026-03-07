import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function ObservatoryHeader({ totalSessions, selectedTitle }: { totalSessions: number; selectedTitle?: string | null }) {
  return (
    <Card className="rounded-[2rem] border-white/10 bg-[#111118]/88 p-6 sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge variant="outline" className="w-fit border-white/12 text-accent">Showcase console</Badge>
          <div className="space-y-2">
            <h1 className="font-display text-4xl leading-none tracking-[-0.05em] text-foreground sm:text-5xl">세션 운영실</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">세션별 실행 상태와 에이전트 이벤트를 하나의 컨트롤 룸에서 읽기 쉽게 정리합니다.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant="secondary">세션 {totalSessions}개</Badge>
          {selectedTitle ? <Badge variant="outline">선택: {selectedTitle}</Badge> : null}
        </div>
      </div>
    </Card>
  );
}
