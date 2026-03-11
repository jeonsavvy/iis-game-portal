import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GET } from "./route";

const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns anonymous payload when no session user exists", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      email: null,
      role: null,
      canAccessWorkspace: false,
      canAccessAdmin: false,
    });
  });

  it("returns email and role for authenticated users", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "admin@example.com" } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: "master_admin" } }),
          }),
        }),
      }),
    } as never);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      email: "admin@example.com",
      role: "master_admin",
      canAccessWorkspace: true,
      canAccessAdmin: true,
    });
  });
});
