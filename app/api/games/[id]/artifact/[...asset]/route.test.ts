import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/games/artifact-proxy", () => ({
  resolveArtifactTarget: vi.fn(),
  proxyArtifactResponse: vi.fn(),
}));

import { proxyArtifactResponse, resolveArtifactTarget } from "@/lib/games/artifact-proxy";
import { ARTIFACT_SECURITY_HEADERS } from "@/lib/api/response-headers";
import { GET } from "./route";

const mockedResolveArtifactTarget = vi.mocked(resolveArtifactTarget);
const mockedProxyArtifactResponse = vi.mocked(proxyArtifactResponse);

describe("GET /api/games/[id]/artifact/[...asset]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("joins asset segments before resolving target", async () => {
    mockedResolveArtifactTarget.mockResolvedValueOnce(
      NextResponse.json({ error: "Invalid artifact path" }, { status: 400 }) as never,
    );

    const response = await GET(new Request("https://portal.example.com/api/games/game-1/artifact/assets/main.js"), {
      params: Promise.resolve({ id: "game-1", asset: ["assets", "main.js"] }),
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(response.headers.get("X-Content-Type-Options")).toBe(ARTIFACT_SECURITY_HEADERS["X-Content-Type-Options"]);
    expect(response.headers.get("X-Frame-Options")).toBe(ARTIFACT_SECURITY_HEADERS["X-Frame-Options"]);
    expect(response.headers.get("Referrer-Policy")).toBe(ARTIFACT_SECURITY_HEADERS["Referrer-Policy"]);
    expect(response.headers.get("Permissions-Policy")).toBe(ARTIFACT_SECURITY_HEADERS["Permissions-Policy"]);
    expect(mockedResolveArtifactTarget).toHaveBeenCalledWith("game-1", "assets/main.js");
    expect(mockedProxyArtifactResponse).not.toHaveBeenCalled();
  });

  it("proxies nested asset when resolver succeeds", async () => {
    mockedResolveArtifactTarget.mockResolvedValueOnce(
      {
        game: { id: "game-1" },
        upstreamUrl: "https://cdn.example.com/games/game-1/assets/main.js",
        contentTypeHint: "application/javascript; charset=utf-8",
      } as never,
    );
    mockedProxyArtifactResponse.mockResolvedValueOnce(
      new NextResponse("console.log('ok')", { status: 200, headers: { "content-type": "application/javascript; charset=utf-8" } }),
    );

    const response = await GET(new Request("https://portal.example.com/api/games/game-1/artifact/assets/main.js"), {
      params: Promise.resolve({ id: "game-1", asset: ["assets", "main.js"] }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(response.headers.get("X-Content-Type-Options")).toBe(ARTIFACT_SECURITY_HEADERS["X-Content-Type-Options"]);
    expect(response.headers.get("X-Frame-Options")).toBe(ARTIFACT_SECURITY_HEADERS["X-Frame-Options"]);
    expect(response.headers.get("Referrer-Policy")).toBe(ARTIFACT_SECURITY_HEADERS["Referrer-Policy"]);
    expect(response.headers.get("Permissions-Policy")).toBe(ARTIFACT_SECURITY_HEADERS["Permissions-Policy"]);
    expect(mockedProxyArtifactResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        upstreamUrl: "https://cdn.example.com/games/game-1/assets/main.js",
      }),
    );
  });
});
