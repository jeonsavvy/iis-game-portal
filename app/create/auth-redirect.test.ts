import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

async function loadMiddleware() {
  vi.resetModules();
  process.env.IIS_DEMO_PREVIEW = "0";
  return import("../../middleware");
}

describe("create route auth redirect", () => {
  it("redirects anonymous visitors from /create to login first", async () => {
    const { middleware } = await loadMiddleware();
    const response = middleware(new NextRequest("http://localhost:3000/create"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fcreate");
  });
});
