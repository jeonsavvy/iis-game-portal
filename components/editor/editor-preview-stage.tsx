import { GamePreview } from "@/components/editor/GamePreview";

export function EditorPreviewStage({ html }: { html: string }) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-[#1b1337]/10 bg-white/78 shadow-[0_18px_36px_rgba(27,19,55,0.06)] backdrop-blur-sm">
      <div className="border-b border-[#1b1337]/8 px-5 py-4">
        <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">미리보기</h2>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <GamePreview html={html} />
      </div>
    </div>
  );
}
