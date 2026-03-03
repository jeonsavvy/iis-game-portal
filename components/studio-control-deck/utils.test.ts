import { describe, expect, it } from "vitest";

import { compactReason, eventTypeLabel, stageEvidence } from "@/components/studio-control-deck/utils";
import type { PipelineLog } from "@/types/pipeline";

function buildLog(partial: Partial<PipelineLog>): PipelineLog {
  return {
    pipeline_id: "p-1",
    stage: "build",
    status: "running",
    agent_name: "developer",
    message: "Builder selfcheck completed.",
    reason: null,
    attempt: 1,
    metadata: {},
    created_at: new Date().toISOString(),
    ...partial,
  };
}

describe("studio deck utils", () => {
  it("labels builder event type", () => {
    const log = buildLog({ metadata: { event_type: "selfcheck" } });
    expect(eventTypeLabel(log)).toBe("자체 검증");
  });

  it("renders module signature evidence", () => {
    const log = buildLog({
      metadata: {
        event_type: "module_assemble",
        module_signature: "abcde12345ffff",
      },
    });
    const evidence = stageEvidence(log);
    expect(evidence.some((row) => row.includes("모듈 abcde123"))).toBe(true);
  });

  it("compresses pydantic validation reason for ui display", () => {
    const reason =
      "1 validation error for IntentContractPayload\nfantasy\n  String should have at most 260 characters [type=string_too_long]\n  For further information visit https://errors.pydantic.dev/2.12/v/string_too_long";
    expect(compactReason(reason)).toBe("IntentContractPayload.fantasy max_length(260)");
  });

  it("truncates unknown long reason safely", () => {
    const reason = `runtime_failure ${"x".repeat(200)}`;
    const summarized = compactReason(reason, 40);
    expect(summarized).not.toBeNull();
    expect((summarized ?? "").length).toBeLessThanOrEqual(41);
    expect(summarized?.endsWith("…")).toBe(true);
  });
});
