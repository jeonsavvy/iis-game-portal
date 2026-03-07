import { GamePreview } from "@/components/editor/GamePreview";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function EditorPreviewStage({ html }: { html: string }) {
  return (
    <div className="grid min-h-0 gap-4">
      <Card className="rounded-[1.8rem] border-white/8 bg-[#111118]/86 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="w-fit text-accent">Preview stage</Badge>
            <h2 className="mt-3 font-display text-[2rem] tracking-[-0.04em] text-foreground">실시간 프리뷰 스테이지</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">현재 세션의 HTML 산출물을 즉시 렌더링해 플레이 감각과 시각 상태를 빠르게 확인합니다.</p>
          </div>
        </div>
      </Card>
      <GamePreview html={html} />
    </div>
  );
}
