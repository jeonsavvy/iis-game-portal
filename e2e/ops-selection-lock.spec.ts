import { expect, test } from "@playwright/test";

test("운영실은 에이전트 듀오 대화 구조를 렌더링한다", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByText("에이전트 듀오 스테이지").first()).toBeVisible();
  await expect(page.getByText("에이전트A").first()).toBeVisible();
  await expect(page.getByText("에이전트B").first()).toBeVisible();
  await expect(page.getByText("자동 제작")).toHaveCount(0);
  await expect(page.getByText("A/B 협업실")).toHaveCount(0);
});

test("운영실에서 선택한 에이전트 카드가 자동으로 원복되지 않는다", async ({ page }) => {
  await page.goto("/admin");

  const developerCard = page.locator(".ops-collab-v2-bubble", { hasText: "개발" }).first();
  await developerCard.click();
  await expect(developerCard).toHaveClass(/is-selected/);

  await page.waitForTimeout(4500);
  await expect(developerCard).toHaveClass(/is-selected/);
});

test("운영실에서 수동 선택한 파이프라인이 폴링으로 덮어써지지 않는다", async ({ page }) => {
  await page.goto("/admin");

  const select = page.locator(".ops-command-grid select.input").first();
  const optionCount = await select.locator("option").count();
  test.skip(optionCount < 2, "프리뷰 데이터에 파이프라인 옵션이 2개 이상일 때만 검증합니다.");

  const secondValue = await select.locator("option").nth(1).getAttribute("value");
  if (!secondValue) {
    test.skip(true, "선택 가능한 두 번째 파이프라인이 없습니다.");
  }

  await select.selectOption(secondValue ?? "");
  await expect(select).toHaveValue(secondValue ?? "");
  await page.waitForTimeout(4500);
  await expect(select).toHaveValue(secondValue ?? "");
});
