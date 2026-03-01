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

const BASE_TAB_ITEMS: Array<{ key: Exclude<TabKey, "shots">; label: string }> = [
  { key: "controls", label: "조작법" },
  { key: "overview", label: "게임 설명" },
];

export function PlayInfoTabs({ gameName, screenshotUrl, controlsHint, overview }: Props) {
  const screenshotTabEnabled = process.env.NEXT_PUBLIC_ENABLE_PLAY_SCREENSHOT_TAB === "1" && Boolean(screenshotUrl);
  const tabItems: Array<{ key: TabKey; label: string }> = screenshotTabEnabled
    ? [...BASE_TAB_ITEMS, { key: "shots", label: "스크린샷" }]
    : BASE_TAB_ITEMS;
  const [activeTab, setActiveTab] = useState<TabKey>("controls");

  return (
    <section className="surface play-info-tabs" id="overview">
      <div className="play-tab-nav" role="tablist" aria-label="게임 상세 탭">
        {tabItems.map((tab) => (
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

        {screenshotTabEnabled && activeTab === "shots" ? (
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
