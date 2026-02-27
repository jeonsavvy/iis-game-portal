import { expect, test } from "@playwright/test";

test("write API blocks null origin requests before auth", async ({ request }) => {
  const response = await request.post("/api/pipelines/trigger", {
    headers: {
      origin: "null",
      "content-type": "application/json",
    },
    data: { keyword: "neon drift" },
  });

  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({
    code: "origin_null",
  });
});

test("write API blocks missing origin requests before auth", async ({ request }) => {
  const response = await request.post("/api/pipelines/trigger", {
    headers: {
      "content-type": "application/json",
    },
    data: { keyword: "neon drift" },
  });

  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({
    code: "origin_missing",
  });
});

test("write API blocks cross-origin requests before auth", async ({ request }) => {
  const response = await request.post("/api/pipelines/trigger", {
    headers: {
      origin: "https://evil.example.com",
      "content-type": "application/json",
    },
    data: { keyword: "neon drift" },
  });

  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({
    code: "origin_mismatch",
  });
});
