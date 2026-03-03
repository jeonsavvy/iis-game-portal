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

function isInteractiveStage(stage: PipelineStage): stage is Exclude<PipelineStage, "done"> {
  return stage !== "done";
}

function isInteractiveLog(log: PipelineLog): log is PipelineLog & { stage: Exclude<PipelineStage, "done"> } {
  return isInteractiveStage(log.stage);
}

export function StudioControlDeck({ initialLogs, previewMode = false }: { initialLogs: PipelineLog[]; previewMode?: boolean }) {
  const [mobileTab, setMobileTab] = useState<(typeof MOBILE_TABS)[number]["key"]>("board");
  const [selectedStage, setSelectedStage] = useState<Exclude<PipelineStage, "done">>("analyze");
  const [stageSelectionLocked, setStageSelectionLocked] = useState(false);
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
      setStageSelectionLocked(false);
      const latestLog = selectedLogs[0];
      if (latestLog && isInteractiveStage(latestLog.stage)) {
        setSelectedStage(latestLog.stage);
        return;
      }

      const latestInteractive = selectedLogs.find(isInteractiveLog);
      if (latestInteractive) {
        setSelectedStage(latestInteractive.stage);
        return;
      }

      const firstExisting = AGENT_LAYOUT.find((agent) => latestStageMap.has(agent.stage));
      if (firstExisting) {
        setSelectedStage(firstExisting.stage);
      }
    }
  }, [selectedPipelineId, selectedLogs, latestStageMap]);

  useEffect(() => {
    if (!stageSelectionLocked) {
      return;
    }
    const selectedExists = selectedLogs.some((log) => log.stage === selectedStage);
    if (!selectedExists) {
      const fallback = selectedLogs.find(isInteractiveLog);
      if (fallback) {
        setSelectedStage(fallback.stage);
      }
    }
  }, [selectedLogs, selectedStage, stageSelectionLocked]);

  const handleSelectStage = (stage: Exclude<PipelineStage, "done">) => {
    setStageSelectionLocked(true);
    setSelectedStage(stage);
  };

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
        setSelectedStage={handleSelectStage}
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
        selectedLogs={selectedLogs}
        setSelectedPipelineId={setSelectedPipelineId}
        setFeedback={setFeedback}
        recentFailures={recentFailures}
        pipelineSummary={pipelineSummary}
      />
    </section>
  );
}
