import { describe, expect, it } from "vitest";

import { extractSessionGenerationInfo, formatGenerationSummary } from "@/lib/admin/session-generation";

describe("extractSessionGenerationInfo", () => {
  it("reads generation source, model, and fallback state from codegen activity metadata", () => {
    const info = extractSessionGenerationInfo([
      {
        id: "event-1",
        event_type: "agent_activity",
        agent: "codegen",
        metadata: {
          source: "vertex",
          model: "gemini-2.5-pro",
          fallback_used: true,
          fallback_rank: 1,
        },
        created_at: "2026-03-11T00:00:00.000Z",
      },
    ]);

    expect(info).toEqual({
      source: "vertex",
      model: "gemini-2.5-pro",
      fallbackUsed: true,
      fallbackRank: 1,
    });
  });

  it("falls back to prompt_run_model_selected metadata when activity metadata is absent", () => {
    const info = extractSessionGenerationInfo([
      {
        id: "event-2",
        event_type: "prompt_run_model_selected",
        metadata: {
          selected_model: "gemini-2.5-flash",
          fallback_used: false,
          fallback_rank: 0,
        },
        created_at: "2026-03-11T00:00:00.000Z",
      },
    ]);

    expect(info).toEqual({
      source: "vertex",
      model: "gemini-2.5-flash",
      fallbackUsed: false,
      fallbackRank: 0,
    });
  });
});

describe("formatGenerationSummary", () => {
  it("returns a compact summary string", () => {
    expect(formatGenerationSummary({
      source: "vertex",
      model: "gemini-2.5-pro",
      fallbackUsed: true,
      fallbackRank: 1,
    })).toBe("Vertex · gemini-2.5-pro · fallback 1");
  });
});
