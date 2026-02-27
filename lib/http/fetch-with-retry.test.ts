import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWithRetry } from "./fetch-with-retry";

describe("fetchWithRetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries GET requests on 5xx and eventually succeeds", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("upstream error", { status: 500 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const response = await fetchWithRetry("https://example.com/api", { method: "GET" }, { retries: 3, timeoutMs: 1_000 });

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retries GET requests on 429 and eventually succeeds", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const response = await fetchWithRetry("https://example.com/api", { method: "GET" }, { retries: 3, timeoutMs: 1_000 });

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not retry POST requests without Idempotency-Key", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("upstream error", { status: 500 }));

    const response = await fetchWithRetry("https://example.com/api", { method: "POST" }, { retries: 3, timeoutMs: 1_000 });

    expect(response.status).toBe(500);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries POST requests when Idempotency-Key is present", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("upstream error", { status: 502 }))
      .mockResolvedValueOnce(new Response("created", { status: 201 }));

    const response = await fetchWithRetry(
      "https://example.com/api",
      { method: "POST", headers: { "Idempotency-Key": "trigger-123" } },
      { retries: 3, timeoutMs: 1_000 },
    );

    expect(response.status).toBe(201);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retries idempotent POST requests on 429 and eventually succeeds", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response("created", { status: 201 }));

    const response = await fetchWithRetry(
      "https://example.com/api",
      { method: "POST", headers: { "Idempotency-Key": "trigger-429" } },
      { retries: 3, timeoutMs: 1_000 },
    );

    expect(response.status).toBe(201);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not retry POST requests when Idempotency-Key is blank", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("upstream error", { status: 502 }));

    const response = await fetchWithRetry(
      "https://example.com/api",
      { method: "POST", headers: { "Idempotency-Key": "   " } },
      { retries: 3, timeoutMs: 1_000 },
    );

    expect(response.status).toBe(502);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries POST requests with lowercase idempotency header", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("upstream error", { status: 502 }))
      .mockResolvedValueOnce(new Response("created", { status: 201 }));

    const response = await fetchWithRetry(
      "https://example.com/api",
      { method: "POST", headers: { "idempotency-key": "trigger-lowercase" } },
      { retries: 3, timeoutMs: 1_000 },
    );

    expect(response.status).toBe(201);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not retry DELETE requests", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("upstream error", { status: 500 }));

    const response = await fetchWithRetry("https://example.com/api", { method: "DELETE" }, { retries: 3, timeoutMs: 1_000 });

    expect(response.status).toBe(500);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("normalizes retries=0 to a single GET attempt", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("upstream error", { status: 500 }));

    const response = await fetchWithRetry("https://example.com/api", { method: "GET" }, { retries: 0, timeoutMs: 1_000 });

    expect(response.status).toBe(500);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("normalizes negative retries to a single idempotent POST attempt", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("upstream error", { status: 500 }));

    const response = await fetchWithRetry(
      "https://example.com/api",
      { method: "POST", headers: { "Idempotency-Key": "trigger-negative" } },
      { retries: -3, timeoutMs: 1_000 },
    );

    expect(response.status).toBe(500);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
