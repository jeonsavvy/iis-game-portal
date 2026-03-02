"use client";

import { useMemo, useState } from "react";

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
  const hasControls = controlsHint.length > 0;
  const tabs = useMemo(
    () => (hasControls ? TAB_ITEMS : TAB_ITEMS.filter((tab) => tab.key !== "controls")),
    [hasControls],
  );
  const [activeTab, setActiveTab] = useState<TabKey>(hasControls ? "controls" : "overview");

  return (
    <section className="surface play-info-tabs" id="overview">
      <div className="play-tab-nav" role="tablist" aria-label="게임 상세 탭">
        {tabs.map((tab) => (
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
        {activeTab === "controls" && hasControls ? (
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
