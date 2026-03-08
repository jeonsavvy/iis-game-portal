import { expect, test } from "@playwright/test";

test("홈은 설명형 hero 없이 게임 진열 중심으로 렌더링된다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "홈" })).toBeVisible();
  await expect(page.getByRole("link", { name: "게임 만들기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "운영실" })).toBeVisible();
  await expect(page.getByText("ARCADE PORTAL")).toHaveCount(0);
  await expect(page.getByText("AI Game Platform")).toHaveCount(0);
  await expect(page.getByText("바로 이해되는 구조")).toHaveCount(0);
  await expect(page.getByText("빠른 이동")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "추천 게임" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "신규 게임" })).toBeVisible();
  await expect(page.getByText("Top played")).toHaveCount(0);
  await expect(page.getByText("Arcade pick")).toHaveCount(0);
  await expect(page.getByText("누적 플레이")).toHaveCount(0);
  await expect(page.getByText("최근 중복 새로고침을 제외한 실제 플레이 기록 기준 1위만 노출합니다.")).toHaveCount(0);
  await expect(page.getByText("plays")).toHaveCount(0);
  await expect(page.getByText("© iis")).toBeVisible();
});

test("작업공간은 좌 채팅 우 미리보기 중심으로 렌더링된다", async ({ page }) => {
  await page.goto("/workspace");

  await expect(page.getByRole("heading", { name: "내 작업공간" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "채팅" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "미리보기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "실행 상태" })).toBeVisible();
  await expect(page.getByLabel("세션 선택")).toBeVisible();
  await expect(page.getByRole("button", { name: "세션 삭제" })).toBeVisible();
  await expect(page.getByText("빠른 작업")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "퍼블리시 승인" })).toHaveCount(0);
});

test("게임 만들기 화면은 설명 카드 대신 바로 시작 구조를 보여준다", async ({ page }) => {
  await page.goto("/create");

  await expect(page.getByRole("heading", { name: "게임 만들기" })).toBeVisible();
  await expect(page.getByText("STEP 1")).toHaveCount(0);
  await expect(page.getByText("STEP 2")).toHaveCount(0);
  await expect(page.getByText("STEP 3")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "레이싱" })).toBeVisible();
  await expect(page.locator("form button svg")).toHaveCount(6);
});
