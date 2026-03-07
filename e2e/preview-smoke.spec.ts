import { expect, test } from "@playwright/test";

test("홈이 프리뷰 모드로 렌더링된다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "지금 뜨는 게임" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "신규 게임" })).toBeVisible();
});

test("플레이 페이지가 대형 플레이 화면과 하단 소개만 노출한다", async ({ page }) => {
  await page.goto("/play/demo-neon-drift");

  await expect(page.getByRole("heading", { name: "Neon Drift: Outrun Chain" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "게임 소개" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "조작법" })).toBeVisible();
  await expect(page.getByText("리더보드")).toHaveCount(0);
  await expect(page.getByText("제작자")).toHaveCount(0);
});

test("프리뷰 홈 필터가 검색 조건을 반영한다", async ({ page }) => {
  await page.goto("/?q=ember");

  await expect(page.getByRole("heading", { name: "검색 결과" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ember Survival Alpha/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Neon Drift: Outrun Chain/ })).toHaveCount(0);
});

test("상세 경로는 플레이 화면으로 바로 리다이렉트된다", async ({ page }) => {
  await page.goto("/games/neon-drift-outrun-chain");

  await expect(page).toHaveURL(/\/play\/neon-drift-outrun-chain$/);
});
