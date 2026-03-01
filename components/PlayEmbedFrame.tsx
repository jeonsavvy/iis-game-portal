"use client";

import { useEffect, useRef, useState } from "react";

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

  const focusFrame = () => {
    frameRef.current?.focus();
  };

  useEffect(() => {
    if (!loaded) {
      return;
    }
    const timer = window.setTimeout(() => {
      focusFrame();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [loaded]);

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
                {compatMode ? "보안 모드로 복귀" : "호환 모드 재실행"}
              </button>
            ) : null}
          </div>
          {usesStrictSandbox ? (
            <p className="play-embed-notice">
              {compatMode
                ? "호환 모드: 일부 구형 게임 호환을 위해 same-origin sandbox를 임시 허용했습니다."
                : "보안 모드: 기본 격리 실행입니다. 입력 반응이 없으면 ‘호환 모드 재실행’을 눌러주세요."}
            </p>
          ) : null}
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
