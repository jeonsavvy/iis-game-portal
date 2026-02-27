import { expect, test } from "@playwright/test";

test("홈이 프리뷰 모드로 렌더링된다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("프리뷰 모드: 실서버 연결 없이 샘플 데이터로 화면을 검수 중입니다.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "지금 플레이 가능" })).toBeVisible();
});

test("플레이 페이지가 프리뷰 스테이지를 노출한다", async ({ page }) => {
  await page.goto("/play/demo-neon-drift");

  await expect(page.getByText("프리뷰 모드 · 실서버 연결 없이 샘플 게임 데이터로 화면을 렌더링합니다.")).toBeVisible();
  await expect(page.getByText("프리뷰 모드: 실게임 iframe 대신 대표 스크린샷을 노출합니다.")).toBeVisible();
});

test("프리뷰 홈 필터가 장르/플레이가능 조건을 반영한다", async ({ page }) => {
  await page.goto("/?genre=survival&playable=1");

  await expect(page.locator("h1")).toHaveText("Ember Survival Alpha");
  await expect(page.getByRole("heading", { name: "Neon Drift: Outrun Chain" })).toHaveCount(0);
});
