"use client";

import { useEffect, useRef, useState } from "react";

type PlayEmbedFrameProps = {
  src: string;
  title: string;
  sandbox: string;
};

export function PlayEmbedFrame({ src, title, sandbox }: PlayEmbedFrameProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [loaded, setLoaded] = useState(false);

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

  return (
    <div className="play-embed-shell">
      <div className="play-embed-toolbar">
        <button className="button button-ghost" type="button" onClick={focusFrame}>
          입력 활성화
        </button>
      </div>
      <iframe
        ref={frameRef}
        src={src}
        title={title}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        sandbox={sandbox}
        referrerPolicy="no-referrer"
        tabIndex={0}
        loading="eager"
        allow="fullscreen; gamepad"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

