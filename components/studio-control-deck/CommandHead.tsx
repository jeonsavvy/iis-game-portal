"use client";

import Image from "next/image";

import {
  CONTROL_LABELS,
  MOBILE_TABS,
  STAGE_LABELS,
  STATUS_LABELS,
} from "@/components/studio-control-deck/config";
import { compactMessage } from "@/components/studio-control-deck/utils";
import type {
  PipelineControlAction,
  PipelineLog,
  PipelineStatus,
  PipelineSummary,
} from "@/types/pipeline";

type MobileTabKey = (typeof MOBILE_TABS)[number]["key"];

type CommandHeadProps = {
  globalStatus: Record<PipelineStatus, number>;
  pollMode: "idle" | "polling";
  selectedPipelineId: string | null;
  setSelectedPipelineId: (pipelineId: string | null) => void;
  pipelines: PipelineLog[];
  pipelineSummary: PipelineSummary | null;
  feedback: string;
  mobileTab: MobileTabKey;
  setMobileTab: (tab: MobileTabKey) => void;
  controlAvailability: Record<
    PipelineControlAction,
    {
      enabled: boolean;
      reason: string;
    }
  >;
  busyAction: PipelineControlAction | null;
  runControl: (action: PipelineControlAction) => Promise<void>;
  pipelineLookupRef: string;
  setPipelineLookupRef: (value: string) => void;
  diagnosticsLoading: boolean;
  diagnosticsCandidates: string[];
  diagnosticsError: string | null;
  diagnosticsResolvedPipelineId: string | null;
};

export function CommandHead({
  globalStatus,
  pollMode,
  selectedPipelineId,
  setSelectedPipelineId,
  pipelines,
  pipelineSummary,
  feedback,
  mobileTab,
  setMobileTab,
  controlAvailability,
  busyAction,
  runControl,
  pipelineLookupRef,
  setPipelineLookupRef,
  diagnosticsLoading,
  diagnosticsCandidates,
  diagnosticsError,
  diagnosticsResolvedPipelineId,
}: CommandHeadProps) {
  return (
    <section className="surface ops-command-head">
      <div className="section-head compact">
        <div>
          <h3 className="section-title">자동 제작</h3>
        </div>
        <Image src="/assets/admin/stage-queue.svg" width={28} height={28} alt="" aria-hidden="true" />
        <div className="ops-status-strip">
          <span className="status-chip tone-running">실행중 {globalStatus.running}</span>
          {globalStatus.retry > 0 ? <span className="status-chip tone-warn">재시도 {globalStatus.retry}</span> : null}
          {globalStatus.error > 0 ? <span className="status-chip tone-error">실패 {globalStatus.error}</span> : null}
          <span className="status-chip tone-success">완료 {globalStatus.success}</span>
          {pollMode === "polling" ? <span className="status-chip tone-warn">폴링중</span> : null}
        </div>
      </div>

      <div className="ops-command-grid">
        <div className="ops-command-inputs">
          <label className="field">
            <span>파이프라인</span>
            <select className="input" value={selectedPipelineId ?? ""} onChange={(event) => setSelectedPipelineId(event.target.value || null)}>
              {pipelines.length === 0 ? <option value="">(파이프라인 없음)</option> : null}
              {pipelines.map((item) => (
                <option key={item.pipeline_id} value={item.pipeline_id}>
                  {item.pipeline_id.slice(0, 8)} · {STAGE_LABELS[item.stage]} · {STATUS_LABELS[item.status]} · {compactMessage(item.message)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>빠른 찾기 (ID / prefix)</span>
            <input
              className="input"
              value={pipelineLookupRef}
              placeholder="예: bb06d86e-398"
              onChange={(event) => setPipelineLookupRef(event.target.value)}
            />
          </label>
        </div>

        <div className="ops-command-buttons">
          {(["pause", "resume", "cancel", "retry"] as PipelineControlAction[]).map((action) => (
            <button
              key={action}
              className={`button ${action === "cancel" ? "button-danger" : action === "resume" ? "button-primary" : "button-ghost"}`}
              type="button"
              title={!controlAvailability[action].enabled ? controlAvailability[action].reason : undefined}
              disabled={!selectedPipelineId || busyAction !== null || !controlAvailability[action].enabled}
              onClick={() => void runControl(action)}
            >
              {busyAction === action ? `${CONTROL_LABELS[action]}...` : CONTROL_LABELS[action]}
            </button>
          ))}
        </div>
      </div>

      {pipelineLookupRef.trim() ? (
        <div className="ops-context-tags">
          {diagnosticsLoading ? <span className="terminal-tag subtle">진단 조회중...</span> : null}
          {diagnosticsResolvedPipelineId ? (
            <span className="terminal-tag subtle">resolved: {diagnosticsResolvedPipelineId.slice(0, 12)}</span>
          ) : null}
          {diagnosticsCandidates.length > 0 ? (
            <span className="terminal-tag subtle">ambiguous: {diagnosticsCandidates.map((id) => id.slice(0, 12)).join(", ")}</span>
          ) : null}
          {diagnosticsError ? <span className="terminal-tag subtle">diagnostics: {diagnosticsError}</span> : null}
        </div>
      ) : null}

      <div className="ops-context-tags">
        <span className="terminal-tag">파이프라인: {selectedPipelineId ? selectedPipelineId.slice(0, 12) : "-"}</span>
        {pipelineSummary?.status ? <span className="terminal-tag subtle">상태: {STATUS_LABELS[pipelineSummary.status]}</span> : null}
      </div>

      {feedback ? <p className="inline-feedback">{feedback}</p> : null}

      <div className="ops-mobile-tabs">
        {MOBILE_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`button button-ghost${mobileTab === tab.key ? " is-active" : ""}`}
            type="button"
            onClick={() => setMobileTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </section>
  );
}
