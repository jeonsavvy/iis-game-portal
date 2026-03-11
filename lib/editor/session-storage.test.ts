import { describe, expect, it } from "vitest";

import { buildLastSessionStorageKey, LEGACY_LAST_SESSION_STORAGE_KEY, normalizeSessionStorageAccountKey } from "@/lib/editor/session-storage";

describe("normalizeSessionStorageAccountKey", () => {
  it("normalizes email casing and whitespace", () => {
    expect(normalizeSessionStorageAccountKey(" Admin@Example.com ")).toBe("admin@example.com");
  });

  it("falls back to guest when email is missing", () => {
    expect(normalizeSessionStorageAccountKey(null)).toBe("guest");
  });
});

describe("buildLastSessionStorageKey", () => {
  it("generates account-scoped session restore keys", () => {
    expect(buildLastSessionStorageKey("admin@example.com")).toBe("iis-workspace-last-session-v3:admin@example.com");
  });

  it("does not reuse the legacy shared key", () => {
    expect(buildLastSessionStorageKey("admin@example.com")).not.toBe(LEGACY_LAST_SESSION_STORAGE_KEY);
  });
});
