"use client";

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
  agentPresenceEnabled: boolean;
  onToggleAgentPresence: () => void;
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
};

export function CommandHead({
  agentPresenceEnabled,
  onToggleAgentPresence,
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
}: CommandHeadProps) {
  return (
    <section className="surface ops-command-head">
      <div className="section-head compact">
        <div>
          <p className="eyebrow">에이전트 사무실</p>
          <h3 className="section-title">자동 제작 파이프라인 관제</h3>
          <p className="section-subtitle">사무실 보드에서 진행 상태를 보고, 가능한 제어만 정확히 실행합니다.</p>
        </div>
        <div className="ops-status-strip">
          <span className="status-chip tone-running">실행중 {globalStatus.running}</span>
          {globalStatus.retry > 0 ? <span className="status-chip tone-warn">재시도 {globalStatus.retry}</span> : null}
          {globalStatus.error > 0 ? <span className="status-chip tone-error">실패 {globalStatus.error}</span> : null}
          <span className="status-chip tone-success">완료 {globalStatus.success}</span>
          {pollMode === "polling" ? <span className="status-chip tone-warn">폴링중</span> : null}
          <button type="button" className="button button-ghost ops-agent-toggle" onClick={onToggleAgentPresence}>
            아이콘 표시 {agentPresenceEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <div className="ops-command-grid">
        <label className="field">
          <span>관측 파이프라인</span>
          <select className="input" value={selectedPipelineId ?? ""} onChange={(event) => setSelectedPipelineId(event.target.value || null)}>
            {pipelines.length === 0 ? <option value="">(파이프라인 없음)</option> : null}
            {pipelines.map((item) => (
              <option key={item.pipeline_id} value={item.pipeline_id}>
                {item.pipeline_id.slice(0, 8)} · {STAGE_LABELS[item.stage]} · {STATUS_LABELS[item.status]} · {compactMessage(item.message)}
              </option>
            ))}
          </select>
        </label>

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

      <div className="ops-context-tags">
        <span className="terminal-tag">파이프라인: {selectedPipelineId ? selectedPipelineId.slice(0, 12) : "-"}</span>
        {pipelineSummary?.status ? <span className="terminal-tag subtle">상태: {STATUS_LABELS[pipelineSummary.status]}</span> : null}
        {pipelineSummary?.waiting_for_stage ? (
          <span className="terminal-tag subtle">대기 단계: {STAGE_LABELS[pipelineSummary.waiting_for_stage]}</span>
        ) : null}
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
