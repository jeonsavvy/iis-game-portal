import { describe, expect, it } from "vitest";

import { eventTypeLabel, stageEvidence } from "@/components/studio-control-deck/utils";
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
});
