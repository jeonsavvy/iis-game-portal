import { describe, expect, it } from "vitest";

import { parseLegacySandboxAllowlist, resolveGameIframeSandboxPolicy } from "./sandbox-policy";

describe("resolveGameIframeSandboxPolicy", () => {
  it("returns strict sandbox policy by default", () => {
    expect(
      resolveGameIframeSandboxPolicy({
        legacySandboxMode: false,
        gameId: "game-1",
        gameSlug: "neon-run",
        legacyAllowlist: new Set<string>(),
      }),
    ).toBe("allow-scripts");
  });

  it("returns legacy sandbox policy only when legacy mode is enabled", () => {
    expect(
      resolveGameIframeSandboxPolicy({
        legacySandboxMode: true,
        gameId: "game-1",
        gameSlug: "neon-run",
        legacyAllowlist: new Set<string>(),
      }),
    ).toBe("allow-scripts allow-same-origin allow-forms");
  });

  it("returns legacy sandbox policy when allowlist includes game id", () => {
    expect(
      resolveGameIframeSandboxPolicy({
        legacySandboxMode: false,
        gameId: "game-1",
        gameSlug: "neon-run",
        legacyAllowlist: new Set(["game-1"]),
      }),
    ).toBe("allow-scripts allow-same-origin allow-forms");
  });

  it("returns legacy sandbox policy when allowlist includes game slug", () => {
    expect(
      resolveGameIframeSandboxPolicy({
        legacySandboxMode: false,
        gameId: "game-2",
        gameSlug: "neon-run",
        legacyAllowlist: new Set(["neon-run"]),
      }),
    ).toBe("allow-scripts allow-same-origin allow-forms");
  });
});

describe("parseLegacySandboxAllowlist", () => {
  it("normalizes comma-separated env values", () => {
    expect(parseLegacySandboxAllowlist(" game-1, Neon-Run ,,  game-2 ")).toEqual(new Set(["game-1", "neon-run", "game-2"]));
  });

  it("returns empty set when env is empty", () => {
    expect(parseLegacySandboxAllowlist(undefined)).toEqual(new Set());
  });
});
