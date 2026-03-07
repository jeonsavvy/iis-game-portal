import { expect, test } from "@playwright/test";

test("홈은 설명형 hero 없이 게임 진열 중심으로 렌더링된다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "홈" })).toBeVisible();
  await expect(page.getByRole("link", { name: "게임 만들기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "운영실" })).toBeVisible();
  await expect(page.getByText("AI Game Platform")).toHaveCount(0);
  await expect(page.getByText("바로 이해되는 구조")).toHaveCount(0);
  await expect(page.getByText("빠른 이동")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "지금 뜨는 게임" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "신규 게임" })).toBeVisible();
});

test("작업공간은 좌 채팅 우 미리보기 중심으로 렌더링된다", async ({ page }) => {
  await page.goto("/workspace");

  await expect(page.getByRole("heading", { name: "내 작업공간" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "채팅" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "미리보기" })).toBeVisible();
  await expect(page.getByText("빠른 작업")).toHaveCount(0);
  await expect(page.getByText("실행 상태")).toHaveCount(0);
});

test("게임 만들기 화면은 설명 카드 대신 바로 시작 구조를 보여준다", async ({ page }) => {
  await page.goto("/create");

  await expect(page.getByRole("heading", { name: "게임 만들기" })).toBeVisible();
  await expect(page.getByText("STEP 1")).toHaveCount(0);
  await expect(page.getByText("STEP 2")).toHaveCount(0);
  await expect(page.getByText("STEP 3")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "레이싱" })).toBeVisible();
});
