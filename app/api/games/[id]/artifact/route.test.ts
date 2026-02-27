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

describe("GET /api/games/[id]/artifact", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns resolver response when game lookup fails", async () => {
    mockedResolveArtifactTarget.mockResolvedValueOnce(
      NextResponse.json({ error: "Game not found" }, { status: 404 }) as never,
    );

    const response = await GET(new Request("https://portal.example.com/api/games/game-1/artifact"), {
      params: Promise.resolve({ id: "game-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "Game not found" });
    expect(mockedResolveArtifactTarget).toHaveBeenCalledWith("game-1", "index.html");
    expect(mockedProxyArtifactResponse).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(response.headers.get("X-Content-Type-Options")).toBe(ARTIFACT_SECURITY_HEADERS["X-Content-Type-Options"]);
    expect(response.headers.get("X-Frame-Options")).toBe(ARTIFACT_SECURITY_HEADERS["X-Frame-Options"]);
    expect(response.headers.get("Referrer-Policy")).toBe(ARTIFACT_SECURITY_HEADERS["Referrer-Policy"]);
    expect(response.headers.get("Permissions-Policy")).toBe(ARTIFACT_SECURITY_HEADERS["Permissions-Policy"]);
  });

  it("proxies artifact when resolver returns target", async () => {
    mockedResolveArtifactTarget.mockResolvedValueOnce(
      {
        game: { id: "game-1" },
        upstreamUrl: "https://cdn.example.com/games/game-1/index.html",
        contentTypeHint: "text/html; charset=utf-8",
      } as never,
    );
    mockedProxyArtifactResponse.mockResolvedValueOnce(
      new NextResponse("<html></html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }),
    );

    const response = await GET(new Request("https://portal.example.com/api/games/game-1/artifact"), {
      params: Promise.resolve({ id: "game-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(response.headers.get("X-Content-Type-Options")).toBe(ARTIFACT_SECURITY_HEADERS["X-Content-Type-Options"]);
    expect(response.headers.get("X-Frame-Options")).toBe(ARTIFACT_SECURITY_HEADERS["X-Frame-Options"]);
    expect(response.headers.get("Referrer-Policy")).toBe(ARTIFACT_SECURITY_HEADERS["Referrer-Policy"]);
    expect(response.headers.get("Permissions-Policy")).toBe(ARTIFACT_SECURITY_HEADERS["Permissions-Policy"]);
    expect(mockedProxyArtifactResponse).toHaveBeenCalledTimes(1);
    expect(mockedProxyArtifactResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        upstreamUrl: "https://cdn.example.com/games/game-1/index.html",
      }),
    );
  });
});
