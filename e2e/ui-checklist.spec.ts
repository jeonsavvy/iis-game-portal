import { expect, test } from "@playwright/test";

test("홈 화면이 hero + curated rail 구조를 유지한다", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".arcade-kicker")).toHaveText("IIS ARCADE");
  await expect(page.getByRole("heading", { name: "빠른 탐색" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "게임 목록" })).toBeVisible();

  await expect(page.locator(".arcade-hero-showcase")).toBeVisible();
  await expect(page.locator(".arcade-game-grid.featured-grid")).toBeVisible();
});

test("플레이 화면이 우선 플레이영역 + 탭 구조를 제공한다", async ({ page }) => {
  await page.goto("/play/demo-neon-drift");

  await expect(page.locator("h1.hero-title")).toHaveText("Neon Drift: Outrun Chain");
  await expect(page.getByRole("tab", { name: "조작법" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "게임 설명" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "스크린샷" })).toHaveCount(0);

  await page.getByRole("tab", { name: "게임 설명" }).click();
  await expect(page.getByText("목표를 빠르게 파악하고 즉시 플레이하세요.")).toBeVisible();
  await expect(page.getByText("AI 디자이너 코멘트 / 생성 히스토리")).toHaveCount(0);
});

test("운영실이 에이전트/보고서/직접제어 구조를 노출한다", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "운영실" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "파이프라인 제어" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "협업 현황" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "대화 흐름" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "제작 보고서" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "직접 제어", exact: true })).toBeVisible();
  await expect(page.getByText("자동 제작")).toHaveCount(0);
  await expect(page.getByText("A/B 협업실")).toHaveCount(0);
  await expect(page.getByText("Dual On")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "게임 완전 삭제 (DB · 스토리지 · 아카이브)" })).toBeVisible();
  await expect(page.getByText("프리뷰 모드: 이 화면은 위험 액션 UX 점검용이며 실제 삭제 요청은 차단됩니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: "완전 삭제 실행" })).toBeDisabled();
});
