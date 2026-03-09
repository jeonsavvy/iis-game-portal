import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/admin-write-route", () => ({
  runAdminWriteRoute: vi.fn(),
}));

vi.mock("@/lib/api/core-engine-proxy", () => ({
  buildCoreActorHeaders: vi.fn(() => ({ "X-IIS-Actor-Id": "user-1", "X-IIS-Actor-Role": "master_admin" })),
  forwardToCoreEngine: vi.fn(),
}));

import { runAdminWriteRoute } from "@/lib/api/admin-write-route";
import { forwardToCoreEngine } from "@/lib/api/core-engine-proxy";
import { POST } from "./route";

const mockedRunAdminWriteRoute = vi.mocked(runAdminWriteRoute);
const mockedForwardToCoreEngine = vi.mocked(forwardToCoreEngine);

describe("POST /api/sessions/[sessionId]/publish", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedRunAdminWriteRoute.mockImplementation(async (_request, handler) => handler({
      userId: "user-1",
      role: "master_admin",
    } as never));
  });

  it("forwards selected thumbnail payload to core", async () => {
    mockedForwardToCoreEngine.mockResolvedValueOnce(NextResponse.json({ success: true }, { status: 200 }));

    const response = await POST(
      new Request("https://portal.example.com/api/sessions/s-1/publish", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://portal.example.com" },
        body: JSON.stringify({
          slug: "road-rush",
          selected_thumbnail: {
            name: "manual.png",
            mime_type: "image/png",
            data_url: "data:image/png;base64,bWFudWFs",
          },
        }),
      }),
      { params: Promise.resolve({ sessionId: "s-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedForwardToCoreEngine).toHaveBeenCalledWith(expect.objectContaining({
      path: "/api/v1/sessions/s-1/publish",
      method: "POST",
      body: {
        game_name: "",
        slug: "road-rush",
        selected_thumbnail: {
          name: "manual.png",
          mime_type: "image/png",
          data_url: "data:image/png;base64,bWFudWFs",
        },
      },
    }));
  });
});
