"use client";

import { useEffect, useState } from "react";

import { CollabBoard } from "@/components/studio-control-deck/CollabBoard";
import { CommandHead } from "@/components/studio-control-deck/CommandHead";
import { MobileActivityPane } from "@/components/studio-control-deck/MobileActivityPane";
import { UtilityShell } from "@/components/studio-control-deck/UtilityShell";
import {
  AGENT_LAYOUT,
  CONTROL_LABELS,
  MOBILE_TABS,
  STAGE_LABELS,
  STATUS_LABELS,
} from "@/components/studio-control-deck/config";
import { usePipelineControl } from "@/components/studio-control-deck/hooks/usePipelineControl";
import { usePipelineLogs } from "@/components/studio-control-deck/hooks/usePipelineLogs";
import type { PipelineLog, PipelineStage } from "@/types/pipeline";

export function StudioControlDeck({ initialLogs, previewMode = false }: { initialLogs: PipelineLog[]; previewMode?: boolean }) {
  const [mobileTab, setMobileTab] = useState<(typeof MOBILE_TABS)[number]["key"]>("board");
  const [selectedStage, setSelectedStage] = useState<Exclude<PipelineStage, "done">>("trigger");
  const [agentPresenceEnabled, setAgentPresenceEnabled] = useState(true);

  const {
    logs,
    selectedPipelineId,
    setSelectedPipelineId,
    pipelines,
    selectedLogs,
    latestStageMap,
    pollMode,
    globalStatus,
    telemetry,
    recentFailures,
    refreshRecentLogs,
  } = usePipelineLogs({ initialLogs, previewMode });

  const { pipelineSummary, busyAction, feedback, setFeedback, refreshSummary, runControl } = usePipelineControl({
    previewMode,
    logs,
    selectedPipelineId,
    controlLabels: CONTROL_LABELS,
    statusLabels: STATUS_LABELS,
    stageLabels: STAGE_LABELS,
    refreshRecentLogs,
  });

  useEffect(() => {
    const waitingStage = pipelineSummary?.waiting_for_stage;
    if (waitingStage && waitingStage !== "done") {
      setSelectedStage(waitingStage);
      return;
    }

    const firstExisting = AGENT_LAYOUT.find((agent) => latestStageMap.has(agent.stage));
    if (firstExisting) {
      setSelectedStage(firstExisting.stage);
    }
  }, [pipelineSummary?.waiting_for_stage, latestStageMap]);

  return (
    <section className={`ops-console-deck${agentPresenceEnabled ? "" : " agent-presence-off"}`}>
      <CommandHead
        agentPresenceEnabled={agentPresenceEnabled}
        onToggleAgentPresence={() => setAgentPresenceEnabled((prev) => !prev)}
        globalStatus={globalStatus}
        pollMode={pollMode}
        selectedPipelineId={selectedPipelineId}
        setSelectedPipelineId={setSelectedPipelineId}
        pipelines={pipelines}
        pipelineSummary={pipelineSummary}
        feedback={feedback}
        mobileTab={mobileTab}
        setMobileTab={setMobileTab}
        busyAction={busyAction}
        runControl={runControl}
      />

      <CollabBoard
        mobileTab={mobileTab}
        telemetry={telemetry}
        latestStageMap={latestStageMap}
        pipelineSummary={pipelineSummary}
        selectedStage={selectedStage}
        setSelectedStage={setSelectedStage}
        selectedLogs={selectedLogs}
        agentPresenceEnabled={agentPresenceEnabled}
        selectedPipelineId={selectedPipelineId}
        busyAction={busyAction}
        runControl={runControl}
      />

      <MobileActivityPane mobileTab={mobileTab} selectedLogs={selectedLogs} />

      <UtilityShell
        mobileTab={mobileTab}
        previewMode={previewMode}
        selectedPipelineId={selectedPipelineId}
        setSelectedPipelineId={setSelectedPipelineId}
        setFeedback={setFeedback}
        refreshSummary={refreshSummary}
        recentFailures={recentFailures}
        pipelineSummary={pipelineSummary}
      />
    </section>
  );
}
