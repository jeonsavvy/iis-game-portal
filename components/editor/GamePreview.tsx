"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { patchHtmlForEmbeddedViewport } from "@/lib/games/embed-html";

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
      <div className="flex min-h-[32rem] items-center justify-center rounded-[1rem] border border-dashed border-zinc-200 bg-white p-6 text-center">
        <div className="max-w-xl space-y-3">
          <h3 className="text-3xl font-semibold tracking-[-0.04em] text-foreground">결과가 여기에 표시됩니다</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-[1.3rem] border border-[#1b1337]/12 bg-[#050816] shadow-[0_24px_60px_rgba(9,12,33,0.22)]">
      <iframe
        ref={frameRef}
        srcDoc={patchHtmlForEmbeddedViewport(html)}
        title={title}
        width="100%"
        height="100%"
        className="min-h-[72vh] w-full border-0 bg-[#050816] xl:min-h-[80vh]"
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
