"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { shouldUseUnoptimizedImage } from "@/lib/images/optimization";

type SimilarGame = {
  id: string;
  name: string;
  genre: string;
  thumbnail_url: string | null;
  screenshot_url: string | null;
};

type Props = {
  gameName: string;
  genre: string;
  aiReview: string | null;
  screenshotUrl: string | null;
  controlsHint: string[];
  overview: string[];
  similarGames: SimilarGame[];
};

type TabKey = "controls" | "overview" | "shots" | "similar";

const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: "controls", label: "조작법" },
  { key: "overview", label: "게임 설명" },
  { key: "shots", label: "스크린샷" },
  { key: "similar", label: "유사 게임" },
];

function normalizeReview(aiReview: string | null): string[] {
  if (!aiReview) return [];
  return aiReview
    .split(/\n+/)
    .map((line) => line.replace(/^[\s\-•\d.)]+/, "").trim())
    .filter(Boolean);
}

export function PlayInfoTabs({ gameName, genre, aiReview, screenshotUrl, controlsHint, overview, similarGames }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("controls");
  const reviewLines = useMemo(() => normalizeReview(aiReview), [aiReview]);

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
            <p className="muted-text">장르: {genre}</p>
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

        {activeTab === "similar" ? (
          similarGames.length > 0 ? (
            <div className="play-similar-grid">
              {similarGames.map((game) => {
                const thumb = game.thumbnail_url ?? game.screenshot_url;
                return (
                  <Link key={game.id} className="play-similar-card" href={`/play/${game.id}`}>
                    {thumb ? (
                      <div className="play-similar-media">
                        <Image
                          src={thumb}
                          alt={`${game.name} thumbnail`}
                          fill
                          sizes="(max-width: 820px) 100vw, 20vw"
                          unoptimized={shouldUseUnoptimizedImage(thumb)}
                        />
                      </div>
                    ) : (
                      <div className="play-similar-fallback" />
                    )}
                    <strong>{game.name}</strong>
                    <span>{game.genre}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="muted-text">같은 장르의 추천 게임이 아직 없습니다.</p>
          )
        ) : null}
      </div>

      <details className="play-secondary-details">
        <summary>AI 디자이너 코멘트 / 생성 히스토리</summary>
        {reviewLines.length > 0 ? (
          <ul className="bullet-list">
            {reviewLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">리뷰 생성 대기 중이거나 생성에 실패했습니다. 운영실에서 최신 로그를 확인해주세요.</p>
        )}
      </details>
    </section>
  );
}
