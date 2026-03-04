"use client";

import { AgentGlyph } from "@/components/studio-control-deck/AgentGlyph";
import { AGENT_LABELS, AGENT_LAYOUT, STATUS_LABELS } from "@/components/studio-control-deck/config";
import {
  compactMessage,
  compactReason,
  deriveDualAgentSummaries,
  qualitySignals,
  stageEvidence,
  statusTone,
} from "@/components/studio-control-deck/utils";
import type { PipelineControlAction, PipelineLog, PipelineStage, PipelineSummary } from "@/types/pipeline";

type MobileTabKey = "board" | "activity" | "control";

type CollabBoardProps = {
  mobileTab: MobileTabKey;
  telemetry: {
    found: number;
    built: number;
    sent: number;
    replied: number;
  };
  latestStageMap: Map<PipelineLog["stage"], PipelineLog>;
  pipelineSummary: PipelineSummary | null;
  selectedStage: Exclude<PipelineStage, "done">;
  setSelectedStage: (stage: Exclude<PipelineStage, "done">) => void;
  selectedLogs: PipelineLog[];
  selectedPipelineId: string | null;
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

export function CollabBoard({
  mobileTab,
  telemetry,
  latestStageMap,
  pipelineSummary,
  selectedStage,
  setSelectedStage,
  selectedLogs,
  selectedPipelineId,
  controlAvailability,
  busyAction,
  runControl,
}: CollabBoardProps) {
  const selectedStageLog = latestStageMap.get(selectedStage) ?? null;
  const selectedAgent = AGENT_LAYOUT.find((item) => item.stage === selectedStage) ?? AGENT_LAYOUT[0];
  const selectedSignals = qualitySignals(selectedStageLog);
  const selectedEvidence = stageEvidence(selectedStageLog);
  const summarizedReason = compactReason(pipelineSummary?.error_reason);
  const dualAgentSummaries = deriveDualAgentSummaries(latestStageMap);

  return (
    <section className={`surface ops-main-layout ops-pane ${mobileTab === "board" ? "is-active" : ""}`}>
      <div className="ops-main-grid">
        <section className="ops-collab-graph">
          <div className="section-head compact">
            <div>
              <h3 className="section-title">보드</h3>
            </div>
            <div className="ops-counters">
              <span>
                <strong>{telemetry.found}</strong>
                <small>설계 완료</small>
              </span>
              <span>
                <strong>{telemetry.built}</strong>
                <small>제작 완료</small>
              </span>
              <span>
                <strong>{telemetry.sent}</strong>
                <small>배포 완료</small>
              </span>
              <span>
                <strong>{telemetry.replied}</strong>
                <small>보고 완료</small>
              </span>
            </div>
          </div>

          <div className="ops-dual-agent-strip" aria-label="2-agent collaboration status">
            {dualAgentSummaries.map((agent) => {
              const tone = statusTone(agent.status);
              return (
                <article key={agent.id} className={`ops-dual-agent-card tone-${tone}`}>
                  <div className="ops-dual-agent-head">
                    <strong>{agent.label}</strong>
                    <span className={`status-chip tone-${tone}`}>{agent.status ? STATUS_LABELS[agent.status] : "유휴"}</span>
                  </div>
                  <p>
                    단계:{" "}
                    {agent.stages
                      .map((stage) => AGENT_LAYOUT.find((item) => item.stage === stage)?.role ?? stage)
                      .join(" · ")}
                  </p>
                  <div className="ops-dual-agent-meta">
                    <span>치명 {agent.fatal}</span>
                    <span>경고 {agent.warning}</span>
                    <span>{agent.latestLog ? new Date(agent.latestLog.created_at).toLocaleTimeString() : "-"}</span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="ops-graph-canvas">
            <svg className="ops-graph-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M17 16 L50 16 L83 16" />
              <path d="M17 16 L17 50 L50 50 L83 50" />
              <path d="M50 16 L50 50" />
              <path d="M83 16 L83 50 L50 82" />
            </svg>

            <div className="ops-node-grid">
              {AGENT_LAYOUT.map((agent) => {
                const stageLog = latestStageMap.get(agent.stage) ?? null;
                const tone = statusTone(stageLog?.status ?? null);
                const active = stageLog?.status === "running";
                const signals = qualitySignals(stageLog);
                const selected = selectedStage === agent.stage;

                return (
                  <button
                    type="button"
                    key={agent.stage}
                    className={`ops-node tone-${tone}${active ? " is-live" : ""}${selected ? " is-selected" : ""}`}
                    style={{ gridColumn: `${agent.gridColumn} / span 1`, gridRow: `${agent.gridRow} / span 1` }}
                    onClick={() => setSelectedStage(agent.stage)}
                  >
                    <div className="ops-node-top">
                      <AgentGlyph icon={agent.icon} tone={tone} active={active} />
                      <div>
                        <h4>{agent.role}</h4>
                      </div>
                    </div>
                    <p className="ops-node-message">{compactMessage(stageLog?.message ?? "유휴")}</p>
                    <div className="ops-node-foot">
                      <span className={`status-chip tone-${tone}`}>{stageLog ? STATUS_LABELS[stageLog.status] : "유휴"}</span>
                      <span>{stageLog ? new Date(stageLog.created_at).toLocaleTimeString() : "-"}</span>
                    </div>
                    {(signals.fatal > 0 || signals.warning > 0) && (
                      <p className="ops-node-signal">
                        치명 {signals.fatal} · 경고 {signals.warning}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="ops-workbench">
          <div className="section-head compact">
            <div>
              <h3 className="section-title">{selectedAgent.role}</h3>
            </div>
            <AgentGlyph
              icon={selectedAgent.icon}
              tone={statusTone(selectedStageLog?.status ?? null)}
              active={selectedStageLog?.status === "running"}
            />
          </div>

          <div className="ops-workbench-card">
            <p className="muted-text">최근: {compactMessage(selectedStageLog?.message)}</p>
            {selectedEvidence.length > 0 ? (
              <ul className="ops-evidence-list">
                {selectedEvidence.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="ops-workbench-meta">
            <span className={`status-chip tone-${statusTone(selectedStageLog?.status ?? null)}`}>
              {selectedStageLog ? STATUS_LABELS[selectedStageLog.status] : "유휴"}
            </span>
            {selectedSignals.fatal > 0 ? <span className="terminal-tag subtle">fatal {selectedSignals.fatal}</span> : null}
            {selectedSignals.warning > 0 ? <span className="terminal-tag subtle">warning {selectedSignals.warning}</span> : null}
            <span className="terminal-tag subtle">
              updated {selectedStageLog ? new Date(selectedStageLog.created_at).toLocaleTimeString() : "-"}
            </span>
            {summarizedReason ? (
              <span className="terminal-tag subtle terminal-tag-wrap" title={pipelineSummary?.error_reason ?? undefined}>
                reason {summarizedReason}
              </span>
            ) : null}
          </div>

          <div className="ops-workbench-actions">
            <button
              className="button button-ghost"
              type="button"
              title={!controlAvailability.pause.enabled ? controlAvailability.pause.reason : undefined}
              onClick={() => void runControl("pause")}
              disabled={!selectedPipelineId || busyAction !== null || !controlAvailability.pause.enabled}
            >
              일시정지
            </button>
            <button
              className="button button-primary"
              type="button"
              title={!controlAvailability.resume.enabled ? controlAvailability.resume.reason : undefined}
              onClick={() => void runControl("resume")}
              disabled={!selectedPipelineId || busyAction !== null || !controlAvailability.resume.enabled}
            >
              재개
            </button>
            <button
              className="button button-danger"
              type="button"
              title={!controlAvailability.cancel.enabled ? controlAvailability.cancel.reason : undefined}
              onClick={() => void runControl("cancel")}
              disabled={!selectedPipelineId || busyAction !== null || !controlAvailability.cancel.enabled}
            >
              중단
            </button>
            <button
              className="button button-ghost"
              type="button"
              title={!controlAvailability.retry.enabled ? controlAvailability.retry.reason : undefined}
              onClick={() => void runControl("retry")}
              disabled={!selectedPipelineId || busyAction !== null || !controlAvailability.retry.enabled}
            >
              재시도
            </button>
          </div>
        </section>

        <aside className="ops-live-log">
          <div className="section-head compact">
            <div>
              <h3 className="section-title">로그</h3>
            </div>
            <span className="muted-text">{selectedLogs.length}개</span>
          </div>

          <ul className="ops-log-list">
            {selectedLogs.length === 0 ? <li className="muted-text">선택된 파이프라인 로그가 없습니다.</li> : null}
            {selectedLogs.slice(0, 26).map((log) => {
              const tone = statusTone(log.status);
              const signals = qualitySignals(log);
              const icon = AGENT_LAYOUT.find((item) => item.stage === log.stage)?.icon ?? "reporter";
              const evidence = stageEvidence(log);
              return (
                <li key={`${log.pipeline_id}-${log.id ?? log.created_at}-${log.stage}`} className={`ops-log-item tone-${tone}`}>
                  <AgentGlyph icon={icon} tone={tone} active={log.status === "running"} />
                  <div>
                    <strong>{AGENT_LABELS[log.agent_name] ?? log.agent_name}</strong>
                    <p>{compactMessage(log.message)}</p>
                    {evidence.length > 0 ? (
                      <div className="ops-log-evidence">
                        {evidence.slice(0, 2).map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    ) : null}
                    {(signals.fatal > 0 || signals.warning > 0) && (
                      <small>
                        치명 {signals.fatal} · 경고 {signals.warning}
                      </small>
                    )}
                  </div>
                  <div className="ops-log-item-meta">
                    <span className={`status-chip tone-${tone}`}>{STATUS_LABELS[log.status]}</span>
                    <time>{new Date(log.created_at).toLocaleTimeString()}</time>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </section>
  );
}
