import { expect, test } from "@playwright/test";

test("플레이 프레임이 16:9 비율에 가깝고 오버플로우를 숨긴다", async ({ page }) => {
  await page.goto("/play/demo-neon-drift");

  const frame = page.locator(".play-frame-wrap");
  await expect(frame).toBeVisible();

  const box = await frame.boundingBox();
  expect(box).not.toBeNull();
  const ratio = (box?.width ?? 16) / Math.max(1, box?.height ?? 9);
  expect(ratio).toBeGreaterThan(1.65);
  expect(ratio).toBeLessThan(1.9);

  const overflow = await frame.evaluate((node) => window.getComputedStyle(node).overflow);
  expect(overflow).toBe("hidden");

  const backgroundColor = await frame.evaluate((node) => window.getComputedStyle(node).backgroundColor);
  const channels = backgroundColor.match(/\d+/g)?.map((value) => Number.parseInt(value, 10)) ?? [];
  expect(channels).toHaveLength(3);
  expect(Math.max(...channels)).toBeLessThanOrEqual(24);
});
