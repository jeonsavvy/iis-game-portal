"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function GameShareActions({ title, detailUrl, playUrl }: { title: string; detailUrl: string; playUrl: string }) {
  const [message, setMessage] = useState("");
  const resolveAbsoluteUrl = (value: string) => {
    if (value.startsWith("http")) return value;
    if (typeof window === "undefined") return value;
    return `${window.location.origin}${value}`;
  };

  async function handleShare() {
    const resolvedDetailUrl = resolveAbsoluteUrl(detailUrl);
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `${title}을 iis에서 확인해보세요.`,
          url: resolvedDetailUrl,
        });
        setMessage("공유 패널을 열었습니다.");
        return;
      }

      await navigator.clipboard.writeText(resolvedDetailUrl);
      setMessage("상세 페이지 링크를 복사했습니다.");
    } catch {
      setMessage("링크 복사에 실패했습니다.");
    }
  }

  async function handleCopyPlayUrl() {
    const resolvedPlayUrl = resolveAbsoluteUrl(playUrl);
    try {
      await navigator.clipboard.writeText(resolvedPlayUrl);
      setMessage("플레이 링크를 복사했습니다.");
    } catch {
      setMessage("플레이 링크 복사에 실패했습니다.");
    }
  }

  return (
    <div className="grid gap-3">
      <Button type="button" onClick={handleShare}>상세 링크 공유</Button>
      <Button type="button" variant="outline" onClick={handleCopyPlayUrl}>플레이 링크 복사</Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
