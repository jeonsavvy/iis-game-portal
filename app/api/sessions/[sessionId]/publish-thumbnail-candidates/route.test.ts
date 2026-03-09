import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/admin-read-route", () => ({
  runAdminReadRoute: vi.fn(),
}));

vi.mock("@/lib/api/core-engine-proxy", () => ({
  forwardToCoreEngine: vi.fn(),
}));

import { runAdminReadRoute } from "@/lib/api/admin-read-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { GET } from "./route";

const mockedRunAdminReadRoute = vi.mocked(runAdminReadRoute);
const mockedForwardToCoreEngine = vi.mocked(forwardToCoreEngine);

describe("GET /api/sessions/[sessionId]/publish-thumbnail-candidates", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedRunAdminReadRoute.mockImplementation(async (handler) => handler({
      userId: "user-1",
      role: "master_admin",
    } as never));
  });

  it("forwards candidate lookup to core", async () => {
    mockedForwardToCoreEngine.mockResolvedValueOnce(
      NextResponse.json({ candidates: [{ id: "auto-1" }] }, { status: 200 }),
    );

    const response = await GET(
      new Request("https://portal.example.com/api/sessions/s-1/publish-thumbnail-candidates"),
      { params: Promise.resolve({ sessionId: "s-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedForwardToCoreEngine).toHaveBeenCalledWith(expect.objectContaining({
      path: "/api/v1/sessions/s-1/publish-thumbnail-candidates",
      method: "GET",
    }));
  });
});
