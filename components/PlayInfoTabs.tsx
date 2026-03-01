"use client";

import Image from "next/image";
import { useState } from "react";

import { shouldUseUnoptimizedImage } from "@/lib/images/optimization";

type Props = {
  gameName: string;
  screenshotUrl: string | null;
  controlsHint: string[];
  overview: string[];
};

type TabKey = "controls" | "overview" | "shots";

const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: "controls", label: "조작법" },
  { key: "overview", label: "게임 설명" },
  { key: "shots", label: "스크린샷" },
];

export function PlayInfoTabs({ gameName, screenshotUrl, controlsHint, overview }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("controls");

  return (
    <section className="surface play-info-tabs" id="overview">
      <div className="play-tab-nav" role="tablist" aria-label="게임 상세 탭">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`play-tab-button ${activeTab === tab.key ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="play-tab-panel" role="tabpanel">
        {activeTab === "controls" ? (
          <ul className="bullet-list">
            {controlsHint.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}

        {activeTab === "overview" ? (
          <div className="stack gap-sm">
            <ul className="bullet-list">
              {overview.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {activeTab === "shots" ? (
          screenshotUrl ? (
            <div className="play-shot-gallery">
              <Image
                src={screenshotUrl}
                alt={`${gameName} screenshot`}
                width={1600}
                height={900}
                unoptimized={shouldUseUnoptimizedImage(screenshotUrl)}
              />
            </div>
          ) : (
            <p className="muted-text">등록된 스크린샷이 없습니다.</p>
          )
        ) : null}
      </div>
    </section>
  );
}
