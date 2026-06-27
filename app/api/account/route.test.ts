import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DELETE } from "./route";

const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const mockedCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);

function request(origin: string | null = "https://portal.example.com") {
  const headers = new Headers();
  if (origin !== null) headers.set("origin", origin);
  return new Request("https://portal.example.com/api/account", {
    method: "DELETE",
    headers,
  });
}

function serverClient({ userId = "creator-1", role = "creator" }: { userId?: string | null; role?: string | null } = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId, email: "creator@example.com" } : null } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: role ? { role } : null }),
        }),
      }),
    }),
  };
}

function adminClient({
  sessionIds = ["session-1", "session-2"],
  authError = null,
}: {
  sessionIds?: string[];
  authError?: Error | null;
} = {}) {
  const operations: Array<{ table: string; op: string; args: unknown[]; payload?: unknown }> = [];
  const ok = { error: null };
  const from = vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(async (...args: unknown[]) => {
        operations.push({ table, op: "select.eq", args });
        if (table === "sessions") {
          return { data: sessionIds.map((id) => ({ id })), error: null };
        }
        return { data: [], error: null };
      }),
    })),
    delete: vi.fn(() => ({
      in: vi.fn(async (...args: unknown[]) => {
        operations.push({ table, op: "delete.in", args });
        return ok;
      }),
      eq: vi.fn(async (...args: unknown[]) => {
        operations.push({ table, op: "delete.eq", args });
        return ok;
      }),
    })),
    update: vi.fn((payload: unknown) => ({
      eq: vi.fn(async (...args: unknown[]) => {
        operations.push({ table, op: "update.eq", args, payload });
        return ok;
      }),
    })),
  }));

  return {
    client: {
      from,
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ data: {}, error: authError }),
        },
      },
    },
    operations,
  };
}

describe("DELETE /api/account", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects missing write origin before auth lookup", async () => {
    const response = await DELETE(request(null));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "origin_missing" });
    expect(mockedCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("rejects anonymous users", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(serverClient({ userId: null }) as never);

    const response = await DELETE(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "unauthorized" });
  });

  it("blocks master admin self deletion", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(serverClient({ role: "master_admin" }) as never);

    const response = await DELETE(request());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "master_admin_delete_forbidden" });
    expect(mockedCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("deletes creator session data, detaches games, and deletes the auth user", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(serverClient({ userId: "creator-1", role: "creator" }) as never);
    const admin = adminClient({ sessionIds: ["session-1", "session-2"] });
    mockedCreateSupabaseAdminClient.mockReturnValueOnce(admin.client as never);

    const response = await DELETE(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      deleted: true,
      data: {
        deletedSessions: 2,
        detachedGames: true,
      },
    });
    expect(admin.operations).toEqual([
      { table: "sessions", op: "select.eq", args: ["user_id", "creator-1"] },
      { table: "session_events", op: "delete.in", args: ["session_id", ["session-1", "session-2"]] },
      { table: "conversation_history", op: "delete.in", args: ["session_id", ["session-1", "session-2"]] },
      { table: "session_publish_history", op: "delete.in", args: ["session_id", ["session-1", "session-2"]] },
      { table: "sessions", op: "delete.eq", args: ["user_id", "creator-1"] },
      { table: "games_metadata", op: "update.eq", args: ["created_by", "creator-1"], payload: { created_by: null } },
      { table: "profiles", op: "delete.eq", args: ["id", "creator-1"] },
    ]);
    expect(admin.client.auth.admin.deleteUser).toHaveBeenCalledWith("creator-1");
  });

  it("normalizes Supabase admin failures", async () => {
    mockedCreateSupabaseServerClient.mockResolvedValueOnce(serverClient({ userId: "creator-1", role: "creator" }) as never);
    const admin = adminClient({ authError: new Error("auth delete failed") });
    mockedCreateSupabaseAdminClient.mockReturnValueOnce(admin.client as never);

    const response = await DELETE(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: "account_delete_failed",
      detail: "auth delete failed",
    });
  });
});
