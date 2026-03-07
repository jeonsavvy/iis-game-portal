import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/admin-guard", () => ({
  withAdminGuard: vi.fn(),
}));

import { withAdminGuard } from "@/lib/api/admin-guard";
import { runAdminWriteRoute } from "./admin-write-route";

const mockedWithAdminGuard = vi.mocked(withAdminGuard);

describe("runAdminWriteRoute", () => {
  it("passes through guard response", async () => {
    const request = new Request("https://portal.example.com/api/sessions", {
      method: "POST",
      headers: { origin: "https://portal.example.com" },
    });
    mockedWithAdminGuard.mockResolvedValueOnce(
      NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 }) as never,
    );

    const response = await runAdminWriteRoute(request, async () => NextResponse.json({ ok: true }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden", code: "forbidden" });
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("runs handler when guard succeeds", async () => {
    const request = new Request("https://portal.example.com/api/sessions", {
      method: "POST",
      headers: { origin: "https://portal.example.com" },
    });
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "u1", role: "master_admin", supabase: {} } as never);

    const response = await runAdminWriteRoute(request, async (auth) => {
      expect(auth.userId).toBe("u1");
      return NextResponse.json({ ok: true }, { status: 201 });
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("normalizes unexpected exceptions to 502", async () => {
    const request = new Request("https://portal.example.com/api/sessions", {
      method: "POST",
      headers: { origin: "https://portal.example.com" },
    });
    mockedWithAdminGuard.mockRejectedValueOnce(new Error("auth backend down"));

    const response = await runAdminWriteRoute(request, async () => NextResponse.json({ ok: true }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Core engine unavailable",
      detail: "auth backend down",
      code: "core_engine_unavailable",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("maps invalid JSON syntax to 400", async () => {
    const request = new Request("https://portal.example.com/api/sessions", {
      method: "POST",
      headers: { origin: "https://portal.example.com" },
    });
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "u1", role: "master_admin", supabase: {} } as never);

    const response = await runAdminWriteRoute(request, async () => {
      throw new SyntaxError("Unexpected token");
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON body",
      code: "invalid_json_body",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("preserves explicit cache header from handler response", async () => {
    const request = new Request("https://portal.example.com/api/sessions", {
      method: "POST",
      headers: { origin: "https://portal.example.com" },
    });
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "u1", role: "master_admin", supabase: {} } as never);

    const response = await runAdminWriteRoute(request, async () =>
      NextResponse.json({ ok: true }, { headers: { "Cache-Control": "public, max-age=60" } }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("passes custom permission through to guard", async () => {
    const request = new Request("https://portal.example.com/api/games/delete", {
      method: "POST",
      headers: { origin: "https://portal.example.com" },
    });
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "u1", role: "master_admin", supabase: {} } as never);

    await runAdminWriteRoute(request, async () => NextResponse.json({ ok: true }), {
      permission: "admin:write",
    });

    expect(mockedWithAdminGuard).toHaveBeenCalledWith("admin:write", { request });
  });
});
