type SessionEventLike = {
  id?: string;
  event_type: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type SessionGenerationInfo = {
  source: string | null;
  model: string | null;
  fallbackUsed: boolean;
  fallbackRank: number | null;
};

function normalizeSource(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function normalizeModel(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function normalizeFallbackRank(raw: unknown): number | null {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

export function extractSessionGenerationInfo(events: SessionEventLike[]): SessionGenerationInfo | null {
  for (const event of events) {
    const metadata = event.metadata ?? {};
    if (event.event_type === "agent_activity") {
      const source = normalizeSource(metadata.source);
      const model = normalizeModel(metadata.model);
      const fallbackUsed = Boolean(metadata.fallback_used);
      const fallbackRank = normalizeFallbackRank(metadata.fallback_rank);

      if (source || model) {
        return { source, model, fallbackUsed, fallbackRank };
      }
    }

    if (event.event_type === "prompt_run_model_selected") {
      const model = normalizeModel(metadata.selected_model);
      const fallbackUsed = Boolean(metadata.fallback_used);
      const fallbackRank = normalizeFallbackRank(metadata.fallback_rank);

      if (model) {
        return { source: "vertex", model, fallbackUsed, fallbackRank };
      }
    }
  }

  return null;
}

export function labelForGenerationSource(source: string | null): string | null {
  if (!source) return null;
  if (source === "vertex") return "Vertex";
  if (source === "stub") return "Stub";
  if (source === "error") return "Error";
  return source;
}

export function formatGenerationSummary(info: SessionGenerationInfo | null): string | null {
  if (!info) return null;

  const parts = [
    labelForGenerationSource(info.source) ? `생성 엔진 ${labelForGenerationSource(info.source)}` : null,
    info.model ? `모델 ${info.model}` : null,
  ];

  const filtered = parts.filter((value): value is string => Boolean(value && value.trim()));
  return filtered.length > 0 ? filtered.join(" · ") : null;
}
