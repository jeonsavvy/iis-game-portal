import { expect, test } from "@playwright/test";

test("홈이 한국형 게임 플랫폼 구조를 렌더링한다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AI로 게임 만들고, 바로 플레이하세요" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "인기 게임" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "신규 게임" })).toBeVisible();
  await expect(page.getByRole("link", { name: "AI로 게임 만들기" }).first()).toBeVisible();
});

test("작업공간이 프리뷰 중심 레이아웃을 제공한다", async ({ page }) => {
  await page.goto("/workspace");

  await expect(page.getByRole("heading", { name: "내 작업공간" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "실시간 미리보기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "실행 상태" })).toBeVisible();
});
