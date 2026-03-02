"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PlayEmbedFrameProps = {
  src: string;
  title: string;
  sandbox: string;
};

const LEGACY_COMPAT_SANDBOX = "allow-scripts allow-same-origin allow-forms";

export function PlayEmbedFrame({ src, title, sandbox }: PlayEmbedFrameProps) {
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
    if (!targetWindow) {
      return;
    }
    targetWindow.postMessage({ type: "iis:recover:start", source: "portal" }, "*");
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    const timer = window.setTimeout(() => {
      focusFrame();
      requestRecoverHandshake();
    }, 80);
    const followupTimer = window.setTimeout(() => {
      requestRecoverHandshake();
    }, 420);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(followupTimer);
    };
  }, [loaded, focusFrame, requestRecoverHandshake]);

  const usesStrictSandbox = !sandbox.includes("allow-same-origin");
  const effectiveSandbox = compatMode ? LEGACY_COMPAT_SANDBOX : sandbox;

  return (
    <div className="play-embed-shell">
      {debugMode ? (
        <>
          <div className="play-embed-toolbar">
            <button className="button button-ghost" type="button" onClick={focusFrame}>
              입력 활성화
            </button>
            {usesStrictSandbox ? (
              <button
                className="button button-ghost"
                type="button"
                onClick={() => {
                  setCompatMode((prev) => !prev);
                  setLoaded(false);
                  setReloadSeed((prev) => prev + 1);
                }}
              >
                {compatMode ? "보안 모드" : "호환 모드"}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
      <iframe
        key={`${src}-${reloadSeed}`}
        ref={frameRef}
        src={src}
        title={title}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        sandbox={effectiveSandbox}
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
