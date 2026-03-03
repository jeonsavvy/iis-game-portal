"use client";

import { useMemo, useState } from "react";

type Props = {
  controlsHint: string[];
  overview: string[];
};

export function PlayInfoTabs({ controlsHint, overview }: Props) {
  const [activeTab, setActiveTab] = useState<"controls" | "overview">("controls");
  const overviewRows = useMemo(() => overview, [overview]);
  const controlRows = useMemo(() => {
    if (controlsHint.length > 0) return controlsHint;
    return [
      "조작법은 게임 화면 상단 안내를 우선 기준으로 확인하세요.",
      "게임별 핵심 조작은 목표/장르에 따라 자동으로 달라질 수 있습니다.",
    ];
  }, [controlsHint]);

  return (
    <section className="surface play-info-tabs" id="overview">
      <div className="play-tab-nav" role="tablist" aria-label="게임 상세 탭">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "controls"}
          className={`play-tab-button ${activeTab === "controls" ? "is-active" : ""}`}
          onClick={() => setActiveTab("controls")}
        >
          조작법
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          className={`play-tab-button ${activeTab === "overview" ? "is-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          게임 설명
        </button>
      </div>

      <div className="play-tab-panel" role="tabpanel">
        <div className="stack gap-sm">
          {activeTab === "controls" ? (
            <ul className="bullet-list">
              {controlRows.map((line, index) => (
                <li key={`control-${index}-${line}`}>{line}</li>
              ))}
            </ul>
          ) : (
            <ul className="bullet-list">
              {overviewRows.map((line, index) => (
                <li key={`overview-${index}-${line}`}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
