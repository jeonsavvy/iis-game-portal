import { useEffect, useMemo, useRef, useState } from "react";

import type { PipelineDiagnosticsResponse } from "@/types/pipeline";

type UsePipelineDiagnosticsArgs = {
  previewMode: boolean;
  selectedPipelineId: string | null;
  pipelineLookupRef: string;
  refreshCursor: string;
};

type UsePipelineDiagnosticsResult = {
  activeRef: string | null;
  diagnostics: PipelineDiagnosticsResponse | null;
  diagnosticsLoading: boolean;
  diagnosticsError: string | null;
  diagnosticsCandidates: string[];
};

type DiagnosticsErrorPayload = {
  error?: string;
  detail?: unknown;
  code?: string;
};

function parseCandidates(payload: DiagnosticsErrorPayload | null): string[] {
  if (!payload || typeof payload.detail !== "object" || payload.detail === null) return [];
  const detail = payload.detail as Record<string, unknown>;
  if (!Array.isArray(detail.candidates)) return [];
  return detail.candidates.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 10);
}

function parseErrorMessage(payload: DiagnosticsErrorPayload | null): string {
  if (!payload) return "diagnostics_unavailable";
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  if (typeof payload.code === "string" && payload.code.trim()) return payload.code;
  return "diagnostics_unavailable";
}

export function usePipelineDiagnostics({
  previewMode,
  selectedPipelineId,
  pipelineLookupRef,
  refreshCursor,
}: UsePipelineDiagnosticsArgs): UsePipelineDiagnosticsResult {
  const [diagnostics, setDiagnostics] = useState<PipelineDiagnosticsResponse | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [diagnosticsCandidates, setDiagnosticsCandidates] = useState<string[]>([]);
  const lastSuccessByRef = useRef<Map<string, { at: number; payload: PipelineDiagnosticsResponse; cursor: string }>>(new Map());

  const activeRef = useMemo(() => {
    const lookup = pipelineLookupRef.trim();
    if (lookup) return lookup;
    return selectedPipelineId?.trim() || null;
  }, [pipelineLookupRef, selectedPipelineId]);

  useEffect(() => {
    if (previewMode) {
      setDiagnostics(null);
      setDiagnosticsLoading(false);
      setDiagnosticsError(null);
      setDiagnosticsCandidates([]);
      return;
    }

    if (!activeRef) {
      setDiagnostics(null);
      setDiagnosticsLoading(false);
      setDiagnosticsError(null);
      setDiagnosticsCandidates([]);
      return;
    }

    const cached = lastSuccessByRef.current.get(activeRef);
    const now = Date.now();
    if (cached && now - cached.at < 3000 && cached.cursor === refreshCursor) {
      setDiagnostics(cached.payload);
      setDiagnosticsLoading(false);
      setDiagnosticsError(null);
      setDiagnosticsCandidates([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setDiagnosticsLoading(true);
      setDiagnosticsError(null);
      setDiagnosticsCandidates([]);

      void fetch(`/api/pipelines/diagnostics?pipelineRef=${encodeURIComponent(activeRef)}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as PipelineDiagnosticsResponse | DiagnosticsErrorPayload | null;
          if (!response.ok) {
            const typedPayload = payload as DiagnosticsErrorPayload | null;
            setDiagnostics(null);
            setDiagnosticsError(parseErrorMessage(typedPayload));
            setDiagnosticsCandidates(parseCandidates(typedPayload));
            return;
          }

          const typed = payload as PipelineDiagnosticsResponse;
          lastSuccessByRef.current.set(activeRef, { at: Date.now(), payload: typed, cursor: refreshCursor });
          setDiagnostics(typed);
          setDiagnosticsError(null);
          setDiagnosticsCandidates([]);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          setDiagnostics(null);
          setDiagnosticsError(error instanceof Error ? error.message : "diagnostics_unavailable");
          setDiagnosticsCandidates([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setDiagnosticsLoading(false);
          }
        });
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [activeRef, previewMode, refreshCursor]);

  return {
    activeRef,
    diagnostics,
    diagnosticsLoading,
    diagnosticsError,
    diagnosticsCandidates,
  };
}
