import { expect, test } from "@playwright/test";

test("홈이 에디토리얼 아케이드 쉘을 렌더링한다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Editorial Arcade", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "큐레이션된 라이브 셀렉션" })).toBeVisible();
});

test("에디터가 프리뷰 스테이지 중심 레이아웃을 제공한다", async ({ page }) => {
  await page.goto("/editor");

  await expect(page.getByRole("heading", { name: "실시간 프리뷰 스테이지" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "진단 레일" })).toBeVisible();
});
