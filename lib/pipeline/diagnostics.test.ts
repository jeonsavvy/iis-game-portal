import { describe, expect, it } from "vitest";

import { applyFailureSnapshotFallback, buildPipelineDiagnostics } from "@/lib/pipeline/diagnostics";
import type { PipelineLog } from "@/types/pipeline";

function buildLog(partial: Partial<PipelineLog>): PipelineLog {
  return {
    pipeline_id: "p-1",
    stage: "build",
    status: "running",
    agent_name: "developer",
    message: "build in progress",
    reason: null,
    attempt: 1,
    metadata: {},
    created_at: "2026-03-04T10:00:00Z",
    ...partial,
  };
}

describe("pipeline diagnostics", () => {
  it("extracts primary/secondary reasons for builder quality floor failure", () => {
    const logs: PipelineLog[] = [
      buildLog({
        stage: "plan",
        agent_name: "planner",
        status: "success",
        message: "plan ready",
        created_at: "2026-03-04T10:00:00Z",
      }),
      buildLog({
        stage: "build",
        status: "error",
        reason: "builder_quality_floor_unmet",
        metadata: {
          blocking_reasons: ["visual_gate_unmet", "visual_contrast", "gameplay_gate_unmet"],
        },
        created_at: "2026-03-04T10:10:00Z",
      }),
    ];

    const report = buildPipelineDiagnostics({
      resolvedPipelineId: "p-1",
      status: "error",
      errorReason: "builder_quality_floor_unmet",
      logs,
    });

    expect(report.primary_failure_reason).toBe("builder_quality_floor_unmet");
    expect(report.secondary_reasons).toEqual(expect.arrayContaining(["visual_gate_unmet", "visual_contrast"]));
    expect(report.failure_reason_groups.find((row) => row.category === "visual")?.reasons.length).toBeGreaterThan(0);
    expect(report.stage_failure_map.build).toEqual(expect.arrayContaining(["builder_quality_floor_unmet"]));
  });

  it("builds quality and intent snapshots with lane/handoff events", () => {
    const logs: PipelineLog[] = [
      buildLog({
        stage: "design",
        status: "success",
        agent_name: "designer",
        metadata: {
          agent_lane: "A",
          handoff_to_stage: "build",
          handoff_summary: "디자인 계약 전달",
        },
        created_at: "2026-03-04T09:59:00Z",
      }),
      buildLog({
        stage: "qa_quality",
        status: "error",
        agent_name: "qa_quality",
        reason: "quality_gate_unmet",
        metadata: {
          quality_gate_report: {
            quality: { ok: true, score: 90, threshold: 50 },
            gameplay: { ok: true, score: 80, threshold: 55 },
            visual: { ok: false, score: 20, threshold: 45 },
          },
          intent_gate_report: {
            ok: false,
            score: 70,
            threshold: 75,
            failed_items: ["fantasy"],
          },
        },
        created_at: "2026-03-04T10:05:00Z",
      }),
    ];

    const report = buildPipelineDiagnostics({
      resolvedPipelineId: "p-1",
      status: "error",
      errorReason: "quality_gate_unmet",
      logs,
    });

    expect(report.quality_snapshot?.visual?.ok).toBe(false);
    expect(report.intent_snapshot?.failed_items).toEqual(["fantasy"]);
    expect(report.agent_thread[0]?.lane).toBe("A");
    expect(report.agent_thread[1]?.lane).toBe("B");
    expect(report.handoff_events.length).toBeGreaterThan(0);
  });

  it("maps checklist reasons into visual/runtime categories with humanized copy", () => {
    const logs: PipelineLog[] = [
      buildLog({
        stage: "build",
        status: "error",
        reason: "builder_quality_floor_unmet",
        metadata: {
          blocking_reasons: ["generation_checklist_unmet", "other:checklist:visual_contrast", "checklist:input_reaction"],
        },
        created_at: "2026-03-04T10:12:00Z",
      }),
    ];

    const report = buildPipelineDiagnostics({
      resolvedPipelineId: "p-2",
      status: "error",
      errorReason: "builder_quality_floor_unmet",
      logs,
    });

    expect(report.failure_reason_groups.find((row) => row.category === "visual")?.reasons).toEqual(
      expect.arrayContaining(["checklist:visual_contrast"]),
    );
    expect(report.failure_reason_groups.find((row) => row.category === "runtime")?.reasons).toEqual(
      expect.arrayContaining(["checklist:input_reaction"]),
    );
    expect(report.secondary_reasons_human ?? []).toEqual(expect.arrayContaining(["시각 대비 체크 미통과"]));
  });

  it("applies persisted failure snapshot when logs are sparse", () => {
    const report = buildPipelineDiagnostics({
      resolvedPipelineId: "p-3",
      status: "error",
      errorReason: null,
      logs: [],
    });
    const hydrated = applyFailureSnapshotFallback(report, {
      primary_failure_reason: "builder_quality_floor_unmet",
      secondary_reasons: ["visual_contrast"],
      failure_reason_groups: { visual: ["visual_contrast"] },
      stage_failure_map: { build: ["builder_quality_floor_unmet"] },
    });

    expect(hydrated.primary_failure_reason).toBe("builder_quality_floor_unmet");
    expect(hydrated.secondary_reasons).toEqual(expect.arrayContaining(["visual_contrast"]));
    expect(hydrated.stage_failure_map.build).toEqual(expect.arrayContaining(["builder_quality_floor_unmet"]));
  });
});
