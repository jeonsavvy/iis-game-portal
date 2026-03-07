import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api/admin-guard", () => ({
  withAdminGuard: vi.fn(),
}));

import { withAdminGuard } from "@/lib/api/admin-guard";
import { runAdminReadRoute } from "./admin-read-route";

const mockedWithAdminGuard = vi.mocked(withAdminGuard);

describe("runAdminReadRoute", () => {
  it("passes through guard response", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce(
      NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 }) as never,
    );

    const response = await runAdminReadRoute(async () => NextResponse.json({ ok: true }), {
      errorHeaders: { "Cache-Control": "no-store, max-age=0" },
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized", code: "unauthorized" });
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("runs handler when guard succeeds", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "u1", role: "master_admin", supabase: {} } as never);

    const response = await runAdminReadRoute(async (auth) => {
      expect(auth.userId).toBe("u1");
      return NextResponse.json({ ok: true });
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("normalizes unexpected exceptions to 502 and keeps headers", async () => {
    mockedWithAdminGuard.mockRejectedValueOnce(new Error("read auth backend down"));

    const response = await runAdminReadRoute(async () => NextResponse.json({ ok: true }), {
      errorHeaders: { "Cache-Control": "no-store, max-age=0" },
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Core engine unavailable",
      detail: "read auth backend down",
      code: "core_engine_unavailable",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("preserves explicit cache header from handler response", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "u1", role: "master_admin", supabase: {} } as never);

    const response = await runAdminReadRoute(async () =>
      NextResponse.json({ ok: true }, { headers: { "Cache-Control": "public, max-age=60" } }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("passes custom permission through to guard", async () => {
    mockedWithAdminGuard.mockResolvedValueOnce({ userId: "u1", role: "master_admin", supabase: {} } as never);

    await runAdminReadRoute(async () => NextResponse.json({ ok: true }), {
      permission: "admin:read",
    });

    expect(mockedWithAdminGuard).toHaveBeenCalledWith("admin:read", { errorHeaders: undefined });
  });
});
