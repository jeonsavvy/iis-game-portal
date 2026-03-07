import { describe, expect, it } from "vitest";

import { normalizeSessionTitle } from "@/lib/editor/session-options";

describe("normalizeSessionTitle", () => {
  it("keeps meaningful titles as-is", () => {
    expect(
      normalizeSessionTitle({
        session_id: "sess-1",
        title: "Golden Isles Flight",
        updated_at: "2026-03-07T12:34:00.000Z",
      }),
    ).toBe("Golden Isles Flight");
  });

  it("relabels generic english session names with a distinguishable korean label", () => {
    expect(
      normalizeSessionTitle({
        session_id: "sess-abcdef12",
        title: "New Session",
        updated_at: "2026-03-07T12:34:00.000Z",
      }),
    ).toBe("새 세션 · ef12");
  });
});
