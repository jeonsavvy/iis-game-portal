import { expect, test } from "@playwright/test";

test("운영실 허브가 세션 운영과 게임 관리로 분리된다", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "운영실" })).toBeVisible();
  await expect(page.getByRole("link", { name: "세션 운영 보기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "게임 관리 보기" })).toBeVisible();
});

test("운영실 세션 페이지는 Session Observatory 구조를 렌더링한다", async ({ page }) => {
  await page.goto("/admin/sessions");

  await expect(page.getByRole("heading", { name: "세션 운영실" })).toBeVisible();
  await expect(page.getByText("세션 목록")).toBeVisible();
  await expect(page.getByText("이벤트 타임라인")).toBeVisible();
  await expect(page.getByText("협업 수정 흐름")).toBeVisible();
  await expect(page.getByText("퍼블리시 승인 흐름")).toBeVisible();
});

test("운영실에서 수동 선택한 세션이 폴링으로 원복되지 않는다", async ({ page }) => {
  await page.goto("/admin/sessions");

  const cards = page.locator("button[aria-pressed]");
  const cardCount = await cards.count();
  test.skip(cardCount < 2, "세션 카드가 2개 이상일 때만 검증합니다.");

  const targetCard = cards.nth(1);
  await targetCard.click();
  await expect(targetCard).toHaveAttribute("aria-pressed", "true");

  await page.waitForTimeout(4500);
  await expect(targetCard).toHaveAttribute("aria-pressed", "true");
});

test("운영실 게임 관리 페이지가 삭제 관리 구조를 렌더링한다", async ({ page }) => {
  await page.goto("/admin/games");

  await expect(page.getByRole("heading", { name: "게임 관리" })).toBeVisible();
  await expect(page.getByText("삭제 대상 선택")).toBeVisible();
  await expect(page.getByText("삭제 확인 (되돌릴 수 없음)")).toBeVisible();
});
