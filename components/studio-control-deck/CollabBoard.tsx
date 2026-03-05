"use client";

import { AgentCollabRoom } from "@/components/studio-control-deck/AgentCollabRoom";
import { AgentGlyph } from "@/components/studio-control-deck/AgentGlyph";
import { HandoffRail } from "@/components/studio-control-deck/HandoffRail";
import { AGENT_LABELS, AGENT_LAYOUT, STATUS_LABELS } from "@/components/studio-control-deck/config";
import {
  compactMessage,
  compactReason,
  deriveDualAgentSummaries,
  qualitySignals,
  stageEvidence,
  statusTone,
} from "@/components/studio-control-deck/utils";
import type { PipelineControlAction, PipelineDiagnosticsResponse, PipelineLog, PipelineStage, PipelineSummary } from "@/types/pipeline";

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
  diagnostics: PipelineDiagnosticsResponse | null;
  diagnosticsLoading: boolean;
  diagnosticsError: string | null;
  diagnosticsCandidates: string[];
  pipelineLookupRef: string;
  collabRoomV2Enabled: boolean;
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
  diagnostics,
  diagnosticsLoading,
  diagnosticsError,
  diagnosticsCandidates,
  pipelineLookupRef,
  collabRoomV2Enabled,
}: CollabBoardProps) {
  const selectedStageLog = latestStageMap.get(selectedStage) ?? null;
  const selectedAgent = AGENT_LAYOUT.find((item) => item.stage === selectedStage) ?? AGENT_LAYOUT[0];
  const selectedSignals = qualitySignals(selectedStageLog);
  const selectedEvidence = stageEvidence(selectedStageLog);
  const summarizedReason = compactReason(pipelineSummary?.error_reason);
  const dualAgentSummaries = deriveDualAgentSummaries(latestStageMap);
  const dualAgentModeDetected = selectedLogs.some((log) => {
    if (log.metadata?.pipeline_dual_agent_mode === true) return true;
    if (log.stage === "plan" && log.metadata?.gdd_source === "dual_agent_synth") return true;
    if (log.stage === "design" && log.metadata?.design_spec_source === "dual_agent_synth") return true;
    const message = (log.message || "").toLowerCase();
    return message.includes("2-agent") || message.includes("dual_agent_synth");
  });
  const failureGroups = diagnostics?.failure_reason_groups ?? [];
  const failureGroupsHuman = diagnostics?.failure_reason_groups_human ?? [];
  const failureCategoryLabel: Record<string, string> = {
    visual: "시각",
    gameplay: "게임플레이",
    runtime: "런타임",
    intent: "의도",
    quality: "품질",
    codegen: "코드 생성",
    system: "시스템",
    other: "기타",
  };
  const stageFailures = diagnostics?.stage_failure_map ? Object.entries(diagnostics.stage_failure_map).slice(0, 6) : [];
  const primaryFailureDisplay =
    diagnostics?.primary_failure_reason_human ?? diagnostics?.primary_failure_reason ?? summarizedReason ?? "-";
  const secondaryFailureDisplay =
    diagnostics?.secondary_reasons_human && diagnostics.secondary_reasons_human.length > 0
      ? diagnostics.secondary_reasons_human
      : diagnostics?.secondary_reasons ?? [];
  const fallbackThread = [...selectedLogs]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((log) => {
      const lane =
        log.metadata?.agent_lane === "A" || log.metadata?.agent_lane === "B" || log.metadata?.agent_lane === "SYSTEM"
          ? log.metadata.agent_lane
          : ["analyze", "plan", "design", "build"].includes(log.stage)
            ? "A"
            : ["qa_runtime", "qa_quality", "release", "report"].includes(log.stage)
              ? "B"
              : "SYSTEM";
      return {
        id: `${log.pipeline_id}-${log.id ?? log.created_at}-${log.stage}`,
        lane,
        stage: log.stage,
        status: log.status,
        agent_name: log.agent_name,
        message: log.message,
        reason: log.reason,
        created_at: log.created_at,
      };
    });
  const fallbackHandoff = fallbackThread
    .slice(1)
    .filter((event, index) => event.lane !== fallbackThread[index].lane)
    .map((event, index) => ({
      id: `${event.id}-fallback-${index}`,
      from_lane: fallbackThread[index].lane,
      to_lane: event.lane,
      stage: event.stage,
      created_at: event.created_at,
      summary: `${fallbackThread[index].stage} → ${event.stage}`,
      reason: event.reason,
    }));
  const threadEvents = diagnostics?.agent_thread && diagnostics.agent_thread.length > 0 ? diagnostics.agent_thread : fallbackThread;
  const handoffEvents = diagnostics?.handoff_events && diagnostics.handoff_events.length > 0 ? diagnostics.handoff_events : fallbackHandoff;

  if (collabRoomV2Enabled) {
    return (
      <section className={`surface ops-main-layout ops-pane ${mobileTab === "board" ? "is-active" : ""}`}>
        <div className="ops-collab-v2-shell">
          <header className="ops-collab-v2-header">
            <div className="section-head compact">
              <div>
                <h3 className="section-title">에이전트 듀오 스테이지</h3>
                <p className="muted-text">에이전트A와 에이전트B가 게임 완성도를 함께 끌어올리고 있어요.</p>
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
            <div className="ops-context-tags">
              <span className={`status-chip tone-${dualAgentModeDetected ? "success" : "warn"}`}>
                {dualAgentModeDetected ? "함께 작업중" : "준비중"}
              </span>
              {pipelineLookupRef.trim() ? <span className="terminal-tag subtle">찾기 {pipelineLookupRef.trim()}</span> : null}
              <span className="terminal-tag subtle">이슈 {compactReason(primaryFailureDisplay, 44) ?? "-"}</span>
            </div>
          </header>

          <div className="ops-collab-v2-grid">
            <div className="ops-collab-v2-main">
              <AgentCollabRoom thread={threadEvents} selectedStage={selectedStage} onSelectStage={setSelectedStage} />
              <HandoffRail events={handoffEvents} />
            </div>

            <aside className="ops-collab-v2-side">
              <article className="surface ops-collab-v2-card">
                <header className="section-head compact">
                  <h4 className="section-title">이번 실패 요약</h4>
                </header>
                {diagnosticsLoading ? <p className="muted-text">진단 조회중...</p> : null}
                {diagnosticsError ? <p className="inline-feedback">진단 오류: {diagnosticsError}</p> : null}
                {diagnosticsCandidates.length > 0 ? (
                  <p className="muted-text">모호한 ID: {diagnosticsCandidates.map((id) => id.slice(0, 12)).join(", ")}</p>
                ) : null}
                <ul className="bullet-list compact">
                  <li>
                    <strong>핵심 원인</strong>: {primaryFailureDisplay}
                  </li>
                  <li>
                    <strong>보조 원인</strong>:{" "}
                    {secondaryFailureDisplay.length > 0 ? secondaryFailureDisplay.slice(0, 3).join(", ") : "-"}
                  </li>
                </ul>
                {failureGroupsHuman.length > 0 ? (
                  <ul className="bullet-list compact">
                    {failureGroupsHuman.slice(0, 4).map((group) => (
                      <li key={group.category}>
                        <strong>{failureCategoryLabel[group.category] ?? group.category}</strong>: {group.reasons.slice(0, 2).join(", ")}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {(failureGroups.length > 0 || stageFailures.length > 0) && (
                  <details className="ops-debug-details">
                    <summary>상세 보기</summary>
                    {failureGroups.length > 0 ? (
                      <ul className="bullet-list compact">
                        {failureGroups.slice(0, 5).map((group) => (
                          <li key={`raw-${group.category}`}>
                            <strong>{group.category}</strong>: {group.reasons.slice(0, 3).join(", ")}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {stageFailures.length > 0 ? (
                      <>
                        <p className="muted-text">단계별 원인</p>
                        <ul className="bullet-list compact">
                          {stageFailures.map(([stage, reasons]) => (
                            <li key={stage}>
                              <strong>{stage}</strong>: {Array.isArray(reasons) ? reasons.slice(0, 2).join(", ") : "-"}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </details>
                )}
              </article>

              <article className="surface ops-collab-v2-card">
                <header className="section-head compact">
                  <h4 className="section-title">품질 게이트 스냅샷</h4>
                </header>
                <ul className="bullet-list compact">
                  <li>
                    <strong>Quality</strong>:{" "}
                    {typeof diagnostics?.quality_snapshot?.quality?.ok === "boolean"
                      ? diagnostics.quality_snapshot.quality.ok
                        ? "PASS"
                        : "FAIL"
                      : "-"}
                  </li>
                  <li>
                    <strong>Gameplay</strong>:{" "}
                    {typeof diagnostics?.quality_snapshot?.gameplay?.ok === "boolean"
                      ? diagnostics.quality_snapshot.gameplay.ok
                        ? "PASS"
                        : "FAIL"
                      : "-"}
                  </li>
                  <li>
                    <strong>Visual</strong>:{" "}
                    {typeof diagnostics?.quality_snapshot?.visual?.ok === "boolean"
                      ? diagnostics.quality_snapshot.visual.ok
                        ? "PASS"
                        : "FAIL"
                      : "-"}
                  </li>
                  <li>
                    <strong>Intent</strong>:{" "}
                    {typeof diagnostics?.intent_snapshot?.ok === "boolean"
                      ? diagnostics.intent_snapshot.ok
                        ? "PASS"
                        : "FAIL"
                      : "-"}
                  </li>
                </ul>
              </article>

              <article className="surface ops-collab-v2-card">
                <header className="section-head compact">
                  <h4 className="section-title">{selectedAgent.role} 제어</h4>
                </header>
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
              </article>
            </aside>

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
        </div>
      </section>
    );
  }

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

          <div className="ops-dual-agent-strip" aria-label="agent duo collaboration status">
            <header className="ops-dual-agent-strip-head">
              <strong>듀오 협업 상태</strong>
              <span className={`status-chip tone-${dualAgentModeDetected ? "success" : "warn"}`}>
                {dualAgentModeDetected ? "함께 작업중" : "준비중"}
              </span>
            </header>
            {dualAgentSummaries.map((agent) => {
              const tone = statusTone(agent.status);
              const latestStage =
                (agent.latestLog && AGENT_LAYOUT.find((item) => item.stage === agent.latestLog?.stage)?.role) || "-";
              return (
                <article key={agent.id} className={`ops-dual-agent-card tone-${tone}`}>
                  <div className="ops-dual-agent-head">
                    <strong>{agent.label}</strong>
                    <span className={`status-chip tone-${tone}`}>{agent.status ? STATUS_LABELS[agent.status] : "유휴"}</span>
                  </div>
                  <p>
                    협업 단계:{" "}
                    {agent.stages
                      .map((stage) => AGENT_LAYOUT.find((item) => item.stage === stage)?.role ?? stage)
                      .join(" · ")}
                  </p>
                  <p className="ops-dual-agent-message">
                    최근 단계: {latestStage}
                    {agent.latestLog ? ` · ${compactMessage(agent.latestLog.message)}` : ""}
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
