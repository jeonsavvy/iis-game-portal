import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function ObservatoryHeader({ totalSessions, selectedTitle, selectedGenerationSummary, selectedFallbackUsed }: { totalSessions: number; selectedTitle?: string | null; selectedGenerationSummary?: string | null; selectedFallbackUsed?: boolean; }) {
  return (
    <Card data-admin-surface="observatory-header" className="p-6 sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit">세션 운영</Badge>
          <h1 className="text-4xl font-semibold leading-none tracking-[-0.05em] text-foreground sm:text-[2.6rem]">세션 운영실</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">세션 흐름과 최근 이벤트를 집중해서 살피는 화면입니다.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant="secondary">세션 {totalSessions}개</Badge>
          {selectedTitle ? <Badge variant="outline">선택: {selectedTitle}</Badge> : null}
          {selectedGenerationSummary ? <Badge variant="outline">{selectedGenerationSummary}</Badge> : null}
          {selectedFallbackUsed ? <Badge variant="secondary">대체 경로 사용</Badge> : null}
        </div>
      </div>
    </Card>
  );
}
