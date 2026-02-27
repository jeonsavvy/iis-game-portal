import { afterEach, describe, expect, it, vi } from "vitest";

import { forwardToCoreEngine } from "./core-engine-proxy";

vi.mock("@/lib/http/fetch-with-retry", () => ({
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry } from "@/lib/http/fetch-with-retry";

const mockedFetchWithRetry = vi.mocked(fetchWithRetry);

function setNodeEnv(value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) {
    delete env.NODE_ENV;
    return;
  }
  env.NODE_ENV = value;
}

describe("forwardToCoreEngine", () => {
  const originalCoreEngineUrl = process.env.CORE_ENGINE_URL;
  const originalCoreEngineApiToken = process.env.CORE_ENGINE_API_TOKEN;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalCoreEngineUrl === undefined) {
      delete process.env.CORE_ENGINE_URL;
    } else {
      process.env.CORE_ENGINE_URL = originalCoreEngineUrl;
    }

    if (originalCoreEngineApiToken === undefined) {
      delete process.env.CORE_ENGINE_API_TOKEN;
    } else {
      process.env.CORE_ENGINE_API_TOKEN = originalCoreEngineApiToken;
    }

    setNodeEnv(originalNodeEnv);

    mockedFetchWithRetry.mockReset();
  });

  it("returns standardized error when CORE_ENGINE_URL is missing", async () => {
    delete process.env.CORE_ENGINE_URL;

    const response = await forwardToCoreEngine({ path: "/api/v1/pipelines/status", method: "GET" });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "CORE_ENGINE_URL is missing",
      code: "core_engine_url_missing",
    });
    expect(mockedFetchWithRetry).not.toHaveBeenCalled();
  });

  it("normalizes upstream non-2xx payload", async () => {
    process.env.CORE_ENGINE_URL = "https://core.example.com";
    mockedFetchWithRetry.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: { reason: "pipeline_conflict" } }), {
        status: 409,
        statusText: "Conflict",
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await forwardToCoreEngine({
      path: "/api/v1/pipelines/trigger",
      method: "POST",
      body: { keyword: "neon" },
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "pipeline_conflict",
      detail: { reason: "pipeline_conflict" },
      code: "pipeline_conflict",
    });
  });

  it("normalizes 404 payload to shared error contract", async () => {
    process.env.CORE_ENGINE_URL = "https://core.example.com";
    mockedFetchWithRetry.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Pipeline not found" }), {
        status: 404,
        statusText: "Not Found",
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await forwardToCoreEngine({
      path: "/api/v1/pipelines/missing",
      method: "GET",
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Pipeline not found",
      detail: "Pipeline not found",
    });
  });

  it("preserves common auth/permission status codes with normalized shape", async () => {
    process.env.CORE_ENGINE_URL = "https://core.example.com";
    mockedFetchWithRetry.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Missing bearer token", code: "unauthorized" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "content-type": "application/json" },
      }),
    );

    const unauthorized = await forwardToCoreEngine({
      path: "/api/v1/pipelines/trigger",
      method: "POST",
      body: { keyword: "neon" },
    });
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toEqual({
      error: "Missing bearer token",
      detail: "Missing bearer token",
      code: "unauthorized",
    });

    mockedFetchWithRetry.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Forbidden", code: "forbidden" }), {
        status: 403,
        statusText: "Forbidden",
        headers: { "content-type": "application/json" },
      }),
    );

    const forbidden = await forwardToCoreEngine({
      path: "/api/v1/pipelines/control",
      method: "POST",
      body: { action: "pause" },
    });
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toEqual({
      error: "Forbidden",
      detail: { error: "Forbidden", code: "forbidden" },
      code: "forbidden",
    });
  });

  it("adds bearer token automatically when configured", async () => {
    process.env.CORE_ENGINE_URL = "https://core.example.com";
    process.env.CORE_ENGINE_API_TOKEN = "secret-token";
    mockedFetchWithRetry.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await forwardToCoreEngine({
      path: "/api/v1/pipelines/trigger",
      method: "POST",
      body: { keyword: "neon" },
    });

    expect(mockedFetchWithRetry).toHaveBeenCalledTimes(1);
    const call = mockedFetchWithRetry.mock.calls[0];
    expect(call?.[0]).toBe("https://core.example.com/api/v1/pipelines/trigger");
    const requestInit = call?.[1];
    const headers = new Headers(requestInit?.headers);
    expect(headers.get("Authorization")).toBe("Bearer secret-token");
  });

  it("fails fast in production when API token and Authorization header are both missing", async () => {
    process.env.CORE_ENGINE_URL = "https://core.example.com";
    delete process.env.CORE_ENGINE_API_TOKEN;
    setNodeEnv("production");

    const response = await forwardToCoreEngine({
      path: "/api/v1/pipelines/trigger",
      method: "POST",
      body: { keyword: "neon" },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "CORE_ENGINE_API_TOKEN is missing",
      code: "core_engine_api_token_missing",
    });
    expect(mockedFetchWithRetry).not.toHaveBeenCalled();
  });

  it("allows production request when explicit Authorization header is provided", async () => {
    process.env.CORE_ENGINE_URL = "https://core.example.com";
    delete process.env.CORE_ENGINE_API_TOKEN;
    setNodeEnv("production");
    mockedFetchWithRetry.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await forwardToCoreEngine({
      path: "/api/v1/pipelines/trigger",
      method: "POST",
      headers: { Authorization: "Bearer explicit-token" },
      body: { keyword: "neon" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mockedFetchWithRetry).toHaveBeenCalledTimes(1);
    const requestInit = mockedFetchWithRetry.mock.calls[0]?.[1];
    const headers = new Headers(requestInit?.headers);
    expect(headers.get("Authorization")).toBe("Bearer explicit-token");
  });

  it("returns 502 with normalized payload on transport failure", async () => {
    process.env.CORE_ENGINE_URL = "https://core.example.com";
    mockedFetchWithRetry.mockRejectedValueOnce(new Error("connect timeout"));

    const response = await forwardToCoreEngine({
      path: "/api/v1/pipelines/trigger",
      method: "POST",
      body: { keyword: "neon" },
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Core engine unavailable",
      detail: "connect timeout",
      code: "core_engine_unavailable",
    });
  });
});
