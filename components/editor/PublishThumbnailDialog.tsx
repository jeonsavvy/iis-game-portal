"use client";

import Image from "next/image";
import { ImagePlus, RefreshCw, Rocket, X } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

import type { ChatAttachment, PublishThumbnailCandidate } from "@/components/editor/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PublishThumbnailDialogProps = {
  open: boolean;
  isLoading: boolean;
  isPublishing: boolean;
  candidates: PublishThumbnailCandidate[];
  selectedCandidateId: string | null;
  manualAttachment: ChatAttachment | null;
  error?: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onSelectCandidate: (candidateId: string) => void;
  onManualAttachmentChange: (attachment: ChatAttachment | null) => void;
  onPublish: () => void;
};

export function PublishThumbnailDialog({
  open,
  isLoading,
  isPublishing,
  candidates,
  selectedCandidateId,
  manualAttachment,
  error,
  onClose,
  onRefresh,
  onSelectCandidate,
  onManualAttachmentChange,
  onPublish,
}: PublishThumbnailDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handlePickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 3_000_000) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      onManualAttachmentChange({
        name: file.name,
        mime_type: file.type,
        data_url: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const hasSelection = Boolean(manualAttachment || selectedCandidateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="grid w-[min(96vw,72rem)] gap-4 rounded-[1.75rem] border border-white/10 bg-[#111118] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em]">퍼블리시 썸네일 선택</h2>
            <p className="mt-1 text-sm text-zinc-400">자동 캡처 후보를 고르거나 직접 이미지를 올리면 그 이미지를 메인/텔레그램에 그대로 씁니다.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPublishing}>
            <X className="size-4" />
            닫기
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isLoading || isPublishing}>
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
            자동 캡처 새로고침
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isPublishing}>
            <ImagePlus className="size-4" />
            직접 이미지 업로드
          </Button>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePickImage} />
        </div>

        {manualAttachment ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3">
            <p className="text-sm font-medium text-emerald-200">직접 업로드 선택됨 · {manualAttachment.name}</p>
            {manualAttachment.data_url ? (
              <Image
                src={manualAttachment.data_url}
                alt={manualAttachment.name}
                width={1600}
                height={900}
                unoptimized
                className="mt-3 aspect-[16/9] w-full rounded-xl object-cover"
              />
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate) => {
            const selected = !manualAttachment && selectedCandidateId === candidate.id;
            return (
              <button
                key={candidate.id}
                type="button"
                className={cn(
                  "grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-white/20",
                  selected && "border-cyan-400 bg-cyan-500/10",
                )}
                onClick={() => onSelectCandidate(candidate.id)}
                disabled={isPublishing}
              >
                <Image
                  src={candidate.data_url}
                  alt={candidate.label}
                  width={1600}
                  height={900}
                  unoptimized
                  className="aspect-[16/9] w-full rounded-xl object-cover"
                />
                <div>
                  <p className="text-sm font-medium">{candidate.label}</p>
                  <p className="text-xs text-zinc-400">{candidate.source === "auto" ? "자동 캡처" : candidate.source}</p>
                </div>
              </button>
            );
          })}
        </div>

        {!manualAttachment && !isLoading && candidates.length === 0 ? (
          <p className="text-sm text-zinc-400">자동 캡처 후보를 못 가져왔습니다. 직접 이미지를 업로드해도 됩니다.</p>
        ) : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPublishing}>
            취소
          </Button>
          <Button type="button" size="sm" onClick={onPublish} disabled={!hasSelection || isPublishing || isLoading}>
            <Rocket className="size-4" />
            선택한 썸네일로 퍼블리시
          </Button>
        </div>
      </div>
    </div>
  );
}
