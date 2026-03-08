import { describe, expect, it } from "vitest";

import { RESTORE_BANNER_DELAY_MS, buildFixReviewState, normalizeWorkspaceError } from "./workspace-feedback";

describe("normalizeWorkspaceError", () => {
  it("rewrites transient core engine aborts into friendly guidance", () => {
    expect(
      normalizeWorkspaceError({
        error: "Core engine unavailable",
        code: "core_engine_unavailable",
        detail: "The operation was aborted",
      }),
    ).toContain("코어 엔진 연결");
  });

  it("does not leak raw abort copy in friendly core engine errors", () => {
    expect(
      normalizeWorkspaceError({
        error: "Core engine unavailable",
        code: "core_engine_unavailable",
        detail: "The operation was aborted",
      }),
    ).not.toContain("The operation was aborted");
  });
});

describe("buildFixReviewState", () => {
  it("shows keep/apply review actions while a preview fix is open", () => {
    expect(buildFixReviewState({ hasPreviewFix: true, historyCount: 0 })).toEqual({
      canKeepCurrentVersion: true,
      canApplyFix: true,
      canRestorePrevious: false,
    });
  });

  it("keeps rollback available after an applied change exists in history", () => {
    expect(buildFixReviewState({ hasPreviewFix: false, historyCount: 2 })).toEqual({
      canKeepCurrentVersion: false,
      canApplyFix: false,
      canRestorePrevious: true,
    });
  });
});

describe("RESTORE_BANNER_DELAY_MS", () => {
  it("keeps restore banners deferred long enough to avoid flicker", () => {
    expect(RESTORE_BANNER_DELAY_MS).toBeGreaterThanOrEqual(300);
  });
});
