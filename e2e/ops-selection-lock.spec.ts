import { expect, test } from "@playwright/test";

test("운영실은 Session Observatory 구조를 렌더링한다", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "세션 운영실" })).toBeVisible();
  await expect(page.getByText("세션 목록")).toBeVisible();
  await expect(page.getByText("이벤트 타임라인")).toBeVisible();
  await expect(page.getByText("협업 수정 흐름")).toBeVisible();
  await expect(page.getByText("퍼블리시 승인 흐름")).toBeVisible();
  await expect(page.getByText("자동 제작")).toHaveCount(0);
  await expect(page.getByText("A/B 협업실")).toHaveCount(0);
});

test("운영실에서 수동 선택한 세션이 폴링으로 원복되지 않는다", async ({ page }) => {
  await page.goto("/admin");

  const cards = page.locator("button.card[aria-pressed]");
  const cardCount = await cards.count();
  test.skip(cardCount < 2, "세션 카드가 2개 이상일 때만 검증합니다.");

  const targetCard = cards.nth(1);
  await targetCard.click();
  await expect(targetCard).toHaveAttribute("aria-pressed", "true");

  await page.waitForTimeout(4500);
  await expect(targetCard).toHaveAttribute("aria-pressed", "true");
});
