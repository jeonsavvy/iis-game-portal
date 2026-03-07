import { GamePreview } from "@/components/editor/GamePreview";

export function EditorPreviewStage({ html }: { html: string }) {
  return (
    <div className="grid min-h-0 gap-3">
      <div>
        <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">미리보기</h2>
      </div>
      <GamePreview html={html} />
    </div>
  );
}
