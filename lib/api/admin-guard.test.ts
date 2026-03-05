import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/rbac", () => ({
  canWriteSessions: vi.fn(),
  canReadSessions: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { withAdminGuard } from "./admin-guard";
import { canReadSessions, canWriteSessions } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mockedCanWriteSessions = vi.mocked(canWriteSessions);
const mockedCanReadSessions = vi.mocked(canReadSessions);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);

function createWriteRequest(origin: string | null, url = "https://portal.example.com/api/sessions"): Request {
  const headers = new Headers();
  if (origin !== null) {
    headers.set("origin", origin);
  }
  return new Request(url, { method: "POST", headers });
}

function createSupabaseMock({
  userId,
  role,
}: {
  userId: string | null;
  role: "master_admin" | null;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: role ? { role } : null,
          }),
        }),
      }),
    }),
  };
}

describe("withAdminGuard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 when write guard request context is missing", async () => {
    const response = await withAdminGuard("session:write", {} as never);

    expect(response).toBeInstanceOf(Response);
    const json = await (response as Response).json();
    expect((response as Response).status).toBe(400);
    expect(json).toMatchObject({ code: "request_context_missing" });
  });

  it("returns 403 when write origin is cross-origin", async () => {
    const response = await withAdminGuard("session:write", {
      request: createWriteRequest("https://evil.example.com"),
    });

    expect(response).toBeInstanceOf(Response);
    const json = await (response as Response).json();
    expect((response as Response).status).toBe(403);
    expect(json).toMatchObject({ code: "origin_mismatch" });
    expect(mockedCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns 403 when write origin is null", async () => {
    const response = await withAdminGuard("session:write", {
      request: createWriteRequest("null"),
    });

    expect(response).toBeInstanceOf(Response);
    const json = await (response as Response).json();
    expect((response as Response).status).toBe(403);
    expect(json).toMatchObject({ code: "origin_null" });
    expect(mockedCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns 403 when write origin header is missing", async () => {
    const response = await withAdminGuard("session:write", {
      request: createWriteRequest(null),
    });

    expect(response).toBeInstanceOf(Response);
    const json = await (response as Response).json();
    expect((response as Response).status).toBe(403);
    expect(json).toMatchObject({ code: "origin_missing" });
    expect(mockedCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns 403 when write origin is malformed", async () => {
    const response = await withAdminGuard("session:write", {
      request: createWriteRequest("not-a-valid-origin"),
    });

    expect(response).toBeInstanceOf(Response);
    const json = await (response as Response).json();
    expect((response as Response).status).toBe(403);
    expect(json).toMatchObject({ code: "origin_invalid" });
    expect(mockedCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(
      createSupabaseMock({ userId: null, role: null }) as never,
    );
    mockedCanReadSessions.mockReturnValueOnce(true);

    const response = await withAdminGuard("session:read");

    expect(response).toBeInstanceOf(Response);
    const json = await (response as Response).json();
    expect((response as Response).status).toBe(401);
    expect(json).toMatchObject({ code: "unauthorized" });
  });

  it("returns admin context when write auth passes", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(
      createSupabaseMock({ userId: "user-1", role: "master_admin" }) as never,
    );
    mockedCanWriteSessions.mockReturnValueOnce(true);

    const result = await withAdminGuard("session:write", {
      request: createWriteRequest("https://portal.example.com"),
    });

    expect(result).not.toBeInstanceOf(Response);
    expect(result).toMatchObject({
      userId: "user-1",
      role: "master_admin",
    });
  });
});
