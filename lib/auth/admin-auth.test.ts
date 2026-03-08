import { describe, expect, it } from "vitest";

import { parseAllowedStaffEmails } from "@/lib/auth/admin-auth";

describe("parseAllowedStaffEmails", () => {
  it("returns an empty list when env is missing", () => {
    expect(parseAllowedStaffEmails(undefined)).toEqual([]);
  });

  it("normalizes and deduplicates configured emails", () => {
    expect(parseAllowedStaffEmails(" Admin@Example.com,admin@example.com, creator@example.com ")).toEqual([
      "admin@example.com",
      "creator@example.com",
    ]);
  });
});
