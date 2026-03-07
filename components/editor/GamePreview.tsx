"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function GamePreview({ html, title = "게임 미리보기" }: { html: string; title?: string }) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  const focusFrame = useCallback(() => {
    frameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(focusFrame, 80);
    return () => window.clearTimeout(timer);
  }, [focusFrame, loaded]);

  if (!html.trim()) {
    return (
      <div className="flex min-h-[32rem] items-center justify-center rounded-[1.9rem] border border-dashed border-white/10 bg-black/20 p-6 text-center">
        <div className="max-w-xl space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Preview</p>
          <h3 className="font-display text-3xl tracking-[-0.04em] text-foreground">게임 미리보기가 여기에 표시됩니다</h3>
          <p className="text-sm leading-7 text-muted-foreground">왼쪽에서 요청을 보내면 결과를 만들고, 실행 상태를 보면서 바로 수정할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.9rem] border border-white/8 bg-black shadow-[var(--shadow-panel)]">
      <iframe
        ref={frameRef}
        srcDoc={html}
        title={title}
        width="100%"
        height="100%"
        className="min-h-[58vh] w-full border-0 bg-black xl:min-h-[72vh]"
        sandbox="allow-scripts allow-same-origin allow-forms"
        referrerPolicy="no-referrer"
        tabIndex={0}
        loading="eager"
        allow="fullscreen; gamepad"
        scrolling="no"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
