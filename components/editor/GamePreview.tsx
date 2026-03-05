"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GamePreviewProps = {
    html: string;
    title?: string;
};

export function GamePreview({ html, title = "게임 미리보기" }: GamePreviewProps) {
    const frameRef = useRef<HTMLIFrameElement | null>(null);
    const [loaded, setLoaded] = useState(false);

    const focusFrame = useCallback(() => {
        frameRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!loaded) return;
        const timer = window.setTimeout(focusFrame, 80);
        return () => window.clearTimeout(timer);
    }, [loaded, focusFrame]);

    if (!html.trim()) {
        return (
            <div className="editor-preview-empty">
                <div className="editor-preview-empty-inner">
                    <span className="editor-preview-icon">🎮</span>
                    <h3>게임 미리보기가 여기에 표시됩니다</h3>
                    <p>왼쪽에서 요청을 보내면 Codegen → Visual QA → Playtester가 순서대로 결과를 개선합니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="editor-preview-shell">
            <iframe
                ref={frameRef}
                srcDoc={html}
                title={title}
                width="100%"
                height="100%"
                style={{ border: 0 }}
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
