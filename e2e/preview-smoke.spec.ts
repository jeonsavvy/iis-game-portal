import { expect, test } from "@playwright/test";

test("홈이 프리뷰 모드로 렌더링된다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AI로 게임 만들고, 바로 플레이하세요" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "인기 게임" })).toBeVisible();
});

test("플레이 페이지가 프리뷰 스테이지를 노출한다", async ({ page }) => {
  await page.goto("/play/demo-neon-drift");

  await expect(page.getByRole("link", { name: "게임 상세 보기" })).toBeVisible();
  await expect(page.getByText("실게임 iframe 대신 대표 스크린샷을 노출합니다.")).toBeVisible();
});

test("프리뷰 홈 필터가 검색 조건을 반영한다", async ({ page }) => {
  await page.goto("/?q=ember");

  await expect(page.locator("h1")).toHaveText("Ember Survival Alpha");
  await expect(page.getByRole("heading", { name: "Neon Drift: Outrun Chain" })).toHaveCount(0);
});

test("게임 상세 페이지가 플레이 CTA와 리더보드를 노출한다", async ({ page }) => {
  await page.goto("/games/neon-drift-outrun-chain");

  await expect(page.getByRole("heading", { name: "Neon Drift: Outrun Chain" })).toBeVisible();
  await expect(page.getByRole("link", { name: "바로 플레이" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "리더보드" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "공유하기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "제작자" })).toBeVisible();
});
