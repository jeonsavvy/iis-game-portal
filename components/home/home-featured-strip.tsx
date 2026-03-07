import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function HomeFeaturedStrip({ totalCount, previewMode }: { totalCount: number; previewMode: boolean }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
      <Card className="rounded-[1.75rem] border-white/8 bg-[#101118]/82 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Curated note</p>
            <h2 className="mt-2 font-display text-3xl tracking-[-0.04em] text-foreground">큐레이션된 라이브 셀렉션</h2>
          </div>
          <Badge variant="outline">{totalCount} games</Badge>
        </div>
      </Card>
      <Card className="rounded-[1.75rem] border-white/8 bg-white/[0.03] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Preview mode</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{previewMode ? "실서버 연결 없이 샘플 데이터로 화면을 검수합니다." : "실시간 카탈로그 상태를 기준으로 화면을 렌더링합니다."}</p>
      </Card>
      <Card className="rounded-[1.75rem] border-white/8 bg-white/[0.03] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Editorial rhythm</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">과한 장식보다 타이포그래피, 여백, 밀도로 아케이드의 품질감을 만듭니다.</p>
      </Card>
    </div>
  );
}
