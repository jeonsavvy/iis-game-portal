"use client";

import { useEffect, useRef, useState } from "react";

import { CollabBoard } from "@/components/studio-control-deck/CollabBoard";
import { CommandHead } from "@/components/studio-control-deck/CommandHead";
import { MobileActivityPane } from "@/components/studio-control-deck/MobileActivityPane";
import { UtilityShell } from "@/components/studio-control-deck/UtilityShell";
import {
  AGENT_LAYOUT,
  CONTROL_LABELS,
  MOBILE_TABS,
  STATUS_LABELS,
} from "@/components/studio-control-deck/config";
import { usePipelineControl } from "@/components/studio-control-deck/hooks/usePipelineControl";
import { usePipelineLogs } from "@/components/studio-control-deck/hooks/usePipelineLogs";
import type { PipelineLog, PipelineStage } from "@/types/pipeline";

export function StudioControlDeck({ initialLogs, previewMode = false }: { initialLogs: PipelineLog[]; previewMode?: boolean }) {
  const [mobileTab, setMobileTab] = useState<(typeof MOBILE_TABS)[number]["key"]>("board");
  const [selectedStage, setSelectedStage] = useState<Exclude<PipelineStage, "done">>("analyze");
  const previousPipelineIdRef = useRef<string | null>(null);

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

  const { pipelineSummary, controlAvailability, busyAction, feedback, setFeedback, runControl } = usePipelineControl({
    previewMode,
    logs,
    selectedPipelineId,
    controlLabels: CONTROL_LABELS,
    statusLabels: STATUS_LABELS,
    refreshRecentLogs,
  });

  useEffect(() => {
    const pipelineChanged = previousPipelineIdRef.current !== selectedPipelineId;
    if (pipelineChanged) {
      previousPipelineIdRef.current = selectedPipelineId;
      const latestLog = selectedLogs[0];
      if (latestLog && latestLog.stage !== "done") {
        setSelectedStage(latestLog.stage);
        return;
      }

      const firstExisting = AGENT_LAYOUT.find((agent) => latestStageMap.has(agent.stage));
      if (firstExisting) {
        setSelectedStage(firstExisting.stage);
      }
    }
  }, [selectedPipelineId, selectedLogs, latestStageMap]);

  return (
    <section className="ops-console-deck">
      <CommandHead
        globalStatus={globalStatus}
        pollMode={pollMode}
        selectedPipelineId={selectedPipelineId}
        setSelectedPipelineId={setSelectedPipelineId}
        pipelines={pipelines}
        pipelineSummary={pipelineSummary}
        feedback={feedback}
        mobileTab={mobileTab}
        setMobileTab={setMobileTab}
        controlAvailability={controlAvailability}
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
        selectedPipelineId={selectedPipelineId}
        controlAvailability={controlAvailability}
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
        recentFailures={recentFailures}
        pipelineSummary={pipelineSummary}
      />
    </section>
  );
}
