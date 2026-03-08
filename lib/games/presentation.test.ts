import { describe, expect, it } from "vitest";

import { resolveGameControls, resolveGameImage, resolveGameOverview, resolveGameSummary, resolveGenreLabel } from "@/lib/games/presentation";

const baseGame = {
  id: "game-1",
  slug: "golden-isles-flight",
  name: "Golden Isles Flight",
  genre: "flight_lowpoly_island_3d",
  genre_primary: null,
  genre_tags: ["flight", "3d"],
  screenshot_url: "https://cdn.example.com/golden-isles-flight.png",
  hero_image_url: "/assets/preview/aether-courier.svg",
  thumbnail_url: "/assets/preview/aether-courier.svg",
  short_description: "Golden Isles Flight · flight_lowpoly_island_3d 플레이를 바로 즐길 수 있는 브라우저 게임",
  marketing_summary: "Golden Isles Flight · flight_lowpoly_island_3d 플레이를 바로 즐길 수 있는 브라우저 게임",
  play_overview: [
    "게임을 시작하면 화면의 목표와 루프를 먼저 확인하세요.",
    "초반에는 생존과 조작 감각 파악에 집중하고, 익숙해지면 기록과 효율을 끌어올리세요.",
  ],
  controls_guide: [
    "기본 이동/조작은 화면 HUD 또는 게임 내 안내를 우선 확인하세요.",
    "재시작은 일반적으로 R 키 기준으로 동작하도록 설계됩니다.",
  ],
} as const;

describe("presentation helpers", () => {
  it("prefers actual screenshot over placeholder hero art", () => {
    expect(resolveGameImage(baseGame as never)).toBe("https://cdn.example.com/golden-isles-flight.png");
  });

  it("normalizes raw machine genre labels", () => {
    expect(resolveGenreLabel(baseGame as never)).toBe("비행");
  });

  it("rewrites robotic summary copy into human copy", () => {
    expect(resolveGameSummary(baseGame as never)).toContain("섬");
    expect(resolveGameSummary(baseGame as never)).not.toContain("flight_lowpoly_island_3d");
  });

  it("replaces generic overview and controls fallback text", () => {
    expect(resolveGameOverview(baseGame as never)[0]).toContain("링");
    expect(resolveGameControls(baseGame as never)[0]).toContain("피치");
    expect(resolveGameControls(baseGame as never).join(" ")).not.toContain("HUD");
  });
});
