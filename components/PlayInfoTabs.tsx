"use client";

import { useState } from "react";

type Props = {
  controlsHint: string[];
  overview: string[];
};

type TabKey = "controls" | "overview";

const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: "controls", label: "조작법" },
  { key: "overview", label: "게임 설명" },
];

export function PlayInfoTabs({ controlsHint, overview }: Props) {
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

      </div>
    </section>
  );
}
