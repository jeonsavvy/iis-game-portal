"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Shield, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const LEGACY_COMPAT_SANDBOX = "allow-scripts allow-same-origin allow-forms";

export function PlayEmbedFrame({ src, title, sandbox }: { src: string; title: string; sandbox: string }) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [compatMode, setCompatMode] = useState(false);
  const [reloadSeed, setReloadSeed] = useState(0);
  const debugMode = process.env.NEXT_PUBLIC_GAME_EMBED_DEBUG === "1";

  const focusFrame = useCallback(() => {
    frameRef.current?.focus();
  }, []);

  const requestRecoverHandshake = useCallback(() => {
    const targetWindow = frameRef.current?.contentWindow;
    if (!targetWindow) return;
    targetWindow.postMessage({ type: "iis:recover:start", source: "portal" }, "*");
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      focusFrame();
      requestRecoverHandshake();
    }, 90);
    const followupTimer = window.setTimeout(requestRecoverHandshake, 420);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(followupTimer);
    };
  }, [focusFrame, loaded, requestRecoverHandshake]);

  const usesStrictSandbox = !sandbox.includes("allow-same-origin");
  const effectiveSandbox = compatMode ? LEGACY_COMPAT_SANDBOX : sandbox;

  return (
    <div className="flex h-full flex-col gap-4">
      {debugMode ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-3 text-xs text-muted-foreground">
          <Button type="button" variant="ghost" size="sm" onClick={focusFrame}>
            <Sparkles className="size-4" />
            입력 활성화
          </Button>
          {usesStrictSandbox ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCompatMode((prev) => !prev);
                setLoaded(false);
                setReloadSeed((prev) => prev + 1);
              }}
            >
              <Shield className="size-4" />
              {compatMode ? "보안 모드" : "호환 모드"}
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="play-frame-wrap relative aspect-video w-full overflow-hidden rounded-[1.8rem] border border-white/8 bg-black shadow-[var(--shadow-panel)]">
        {!loaded ? <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.05] to-transparent" aria-hidden="true" /> : null}
        <iframe
          key={`${src}-${reloadSeed}`}
          ref={frameRef}
          src={src}
          title={title}
          width="100%"
          height="100%"
          className="relative z-10 h-full w-full border-0"
          sandbox={effectiveSandbox}
          referrerPolicy="no-referrer"
          tabIndex={0}
          loading="eager"
          allow="fullscreen; gamepad"
          scrolling="no"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
