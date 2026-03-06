import { describe, expect, it } from "vitest";

import { isTransientCoreEnginePollFailure } from "./run-polling";

describe("isTransientCoreEnginePollFailure", () => {
  it("treats core engine unavailable payloads as transient", () => {
    expect(
      isTransientCoreEnginePollFailure({
        status: 502,
        payload: {
          error: "Core engine unavailable",
          code: "core_engine_unavailable",
          detail: "The operation was aborted",
        },
      }),
    ).toBe(true);
  });

  it("treats abort messages as transient even without payload", () => {
    expect(
      isTransientCoreEnginePollFailure({
        message: "The operation was aborted",
      }),
    ).toBe(true);
  });

  it("does not treat not-found responses as transient", () => {
    expect(
      isTransientCoreEnginePollFailure({
        status: 404,
        payload: {
          error: "Run not found",
          code: "run_not_found",
        },
      }),
    ).toBe(false);
  });
});
