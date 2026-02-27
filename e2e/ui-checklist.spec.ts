import { expect, test } from "@playwright/test";

test("홈 화면이 hero + curated rail 구조를 유지한다", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".arcade-kicker")).toHaveText("IIS ARCADE");
  await expect(page.getByText("Quick Discover")).toBeVisible();
  await expect(page.getByRole("heading", { name: "큐레이터 픽 / 실험작" })).toBeVisible();

  await expect(page.locator(".arcade-hero-showcase")).toBeVisible();
  await expect(page.locator(".arcade-game-grid.featured-grid")).toBeVisible();
});

test("플레이 화면이 우선 플레이영역 + 탭 구조를 제공한다", async ({ page }) => {
  await page.goto("/play/demo-neon-drift");

  await expect(page.locator("h1.hero-title")).toHaveText("Neon Drift: Outrun Chain");
  await expect(page.getByText("핵심 메타")).toBeVisible();
  await expect(page.getByRole("tab", { name: "게임 설명" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "유사 게임" })).toBeVisible();

  await page.getByRole("tab", { name: "게임 설명" }).click();
  await expect(page.getByText("장르:")).toBeVisible();
  await expect(page.getByText("AI 디자이너 코멘트 / 생성 히스토리")).toBeVisible();
});

test("운영 콘솔이 Collab Graph/Workbench/로그 구조를 노출한다", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "스튜디오 임무 콘솔" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "멀티 에이전트 협업 관제" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "에이전트 작업대" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "실시간 로그" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "실행/승인 시뮬레이션" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "완전 삭제 (DB · 스토리지 · 아카이브)" })).toBeVisible();
  await expect(page.getByText("프리뷰 모드: 이 화면은 위험 액션 UX 점검용이며 실제 삭제 요청은 차단됩니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: "완전 삭제 실행" })).toBeDisabled();
});
