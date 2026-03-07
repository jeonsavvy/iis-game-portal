import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function ObservatoryHeader({ totalSessions, selectedTitle }: { totalSessions: number; selectedTitle?: string | null }) {
  return (
    <Card data-admin-surface="observatory-header" className="p-6 sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit">세션 운영</Badge>
          <h1 className="text-4xl font-bold leading-none tracking-[-0.05em] text-foreground sm:text-[2.6rem]">세션 운영실</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">세션 상태와 최근 이벤트를 한 화면에서 빠르게 확인합니다.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant="secondary">세션 {totalSessions}개</Badge>
          {selectedTitle ? <Badge variant="outline">선택: {selectedTitle}</Badge> : null}
        </div>
      </div>
    </Card>
  );
}
