"use client";

type Props = {
  controlsHint: string[];
  overview: string[];
};

export function PlayInfoTabs({ controlsHint, overview }: Props) {
  const hasControls = controlsHint.length > 0;
  const overviewRows = hasControls ? [...overview, "조작법은 게임 화면 내부 안내를 기준으로 확인하세요."] : overview;
  return (
    <section className="surface play-info-tabs" id="overview">
      <div className="play-tab-nav" role="tablist" aria-label="게임 상세 탭">
        <button type="button" role="tab" aria-selected className="play-tab-button is-active">
          게임 설명
        </button>
      </div>

      <div className="play-tab-panel" role="tabpanel">
        <div className="stack gap-sm">
          <ul className="bullet-list">
            {overviewRows.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
