import { describe, expect, it } from "vitest";

import { canUseStaffLogin, normalizeNextPath, normalizeStaffEmail } from "@/lib/auth/admin-auth";

describe("normalizeStaffEmail", () => {
  it("normalizes casing and whitespace", () => {
    expect(normalizeStaffEmail(" Admin@Example.com ")).toBe("admin@example.com");
  });

  it("returns empty string for missing values", () => {
    expect(normalizeStaffEmail(undefined)).toBe("");
  });
});

describe("canUseStaffLogin", () => {
  it("allows creator and master admin roles", () => {
    expect(canUseStaffLogin("creator")).toBe(true);
    expect(canUseStaffLogin("master_admin")).toBe(true);
  });

  it("rejects missing roles", () => {
    expect(canUseStaffLogin(null)).toBe(false);
  });
});

describe("normalizeNextPath", () => {
  it("keeps safe internal paths", () => {
    expect(normalizeNextPath("/workspace", "/admin")).toBe("/workspace");
  });

  it("rejects external-looking paths", () => {
    expect(normalizeNextPath("//evil.example.com", "/admin")).toBe("/admin");
  });
});
