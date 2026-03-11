import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/admin-read-route", () => ({
  runAdminReadRoute: vi.fn(),
}));

vi.mock("@/lib/api/admin-write-route", () => ({
  runAdminWriteRoute: vi.fn(),
}));

vi.mock("@/lib/api/core-engine-proxy", () => ({
  buildCoreActorHeaders: vi.fn(() => ({ "X-IIS-Actor-Id": "user-1", "X-IIS-Actor-Role": "creator" })),
  forwardToCoreEngine: vi.fn(),
}));

import { runAdminReadRoute } from "@/lib/api/admin-read-route";
import { buildCoreActorHeaders, forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { GET } from "./route";

const mockedRunAdminReadRoute = vi.mocked(runAdminReadRoute);
const mockedBuildCoreActorHeaders = vi.mocked(buildCoreActorHeaders);
const mockedForwardToCoreEngine = vi.mocked(forwardToCoreEngine);

describe("GET /api/sessions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedRunAdminReadRoute.mockImplementation(async (handler) => handler({
      userId: "user-1",
      role: "creator",
    } as never));
  });

  it("forwards actor headers so core can scope sessions by owner", async () => {
    mockedForwardToCoreEngine.mockResolvedValueOnce(NextResponse.json({ sessions: [] }, { status: 200 }));

    const response = await GET(new Request("https://portal.example.com/api/sessions?limit=20"));

    expect(response.status).toBe(200);
    expect(mockedBuildCoreActorHeaders).toHaveBeenCalledWith({ userId: "user-1", role: "creator" });
    expect(mockedForwardToCoreEngine).toHaveBeenCalledWith(expect.objectContaining({
      path: "/api/v1/sessions?limit=20",
      method: "GET",
      headers: { "X-IIS-Actor-Id": "user-1", "X-IIS-Actor-Role": "creator" },
    }));
  });
});
