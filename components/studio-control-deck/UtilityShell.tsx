"use client";

import Image from "next/image";

import { TriggerForm } from "@/components/TriggerForm";
import { STAGE_LABELS, STATUS_LABELS } from "@/components/studio-control-deck/config";
import { compactMessage } from "@/components/studio-control-deck/utils";
import type { PipelineLog, PipelineSummary } from "@/types/pipeline";

type MobileTabKey = "board" | "activity" | "control";

type UtilityShellProps = {
  mobileTab: MobileTabKey;
  previewMode: boolean;
  selectedPipelineId: string | null;
  selectedLogs: PipelineLog[];
  setSelectedPipelineId: (pipelineId: string | null) => void;
  setFeedback: (value: string) => void;
  recentFailures: PipelineLog[];
  pipelineSummary: PipelineSummary | null;
};

export function UtilityShell({
  mobileTab,
  previewMode,
  selectedPipelineId,
  selectedLogs,
  setSelectedPipelineId,
  setFeedback,
  recentFailures,
  pipelineSummary,
}: UtilityShellProps) {
  const qualityLog =
    selectedLogs.find((log) => Boolean(log.metadata?.quality_gate_report)) ??
    selectedLogs.find((log) => Array.isArray(log.metadata?.blocking_reasons)) ??
    selectedLogs.find((log) => Array.isArray(log.metadata?.quality_floor_fail_reasons)) ??
    null;
  const qualityReport = qualityLog?.metadata?.quality_gate_report;
  const qualityRows = [
    {
      key: "quality",
      label: "Quality",
      ok: qualityReport?.quality?.ok,
      score: qualityReport?.quality?.score,
      threshold: qualityReport?.quality?.threshold,
    },
    {
      key: "gameplay",
      label: "Gameplay",
      ok: qualityReport?.gameplay?.ok,
      score: qualityReport?.gameplay?.score,
      threshold: qualityReport?.gameplay?.threshold,
    },
    {
      key: "visual",
      label: "Visual",
      ok: qualityReport?.visual?.ok,
      score: qualityReport?.visual?.score,
      threshold: qualityReport?.visual?.threshold,
    },
    {
      key: "playability",
      label: "Playability",
      ok: qualityReport?.playability?.ok,
      score: qualityReport?.playability?.score,
      threshold: undefined,
    },
    {
      key: "smoke",
      label: "Smoke",
      ok: qualityReport?.smoke?.ok,
      score: undefined,
      threshold: undefined,
    },
  ];
  const blockingReasons =
    (Array.isArray(qualityLog?.metadata?.blocking_reasons)
      ? qualityLog?.metadata?.blocking_reasons
      : Array.isArray(qualityLog?.metadata?.quality_floor_fail_reasons)
        ? qualityLog?.metadata?.quality_floor_fail_reasons
        : []
    ).filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  return (
    <section className={`surface ops-utility-shell ops-pane ${mobileTab === "control" ? "is-active" : ""}`}>
      <div className="ops-utility-grid">
        {previewMode ? (
          <article className="surface form-panel ops-utility-card">
            <div className="section-head compact">
              <div>
                <h3 className="section-title">실행</h3>
              </div>
            </div>
            <p className="muted-text">프리뷰 모드에서는 실제 트리거/제어 요청을 전송하지 않습니다.</p>
            <p className="inline-feedback">상단 제어 버튼은 시뮬레이션 피드백만 제공합니다.</p>
          </article>
        ) : (
          <TriggerForm
            className="ops-utility-card"
            onTriggered={(item) => {
              setSelectedPipelineId(item.pipelineId);
              setFeedback(`신규 파이프라인 등록: ${item.pipelineId}`);
            }}
          />
        )}

        <article className="surface form-panel ops-utility-card">
          <div className="section-head compact">
            <div>
              <h3 className="section-title">실패 내역</h3>
            </div>
          </div>

          {recentFailures.length === 0 ? (
            <p className="muted-text">최근 실패가 없습니다.</p>
          ) : (
            <ul className="bullet-list compact">
              {recentFailures.map((log) => (
                <li key={`${log.pipeline_id}-${log.id ?? log.created_at}-failure`}>
                  <strong>{STAGE_LABELS[log.stage]}:</strong> {compactMessage(log.reason ?? log.message)}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="surface form-panel ops-utility-card">
          <div className="section-head compact">
            <div>
              <h3 className="section-title">실행 상태</h3>
            </div>
          </div>

          <ul className="bullet-list compact">
            <li>
              <strong>현재 파이프라인:</strong> {selectedPipelineId ? selectedPipelineId.slice(0, 12) : "-"}
            </li>
            <li>
              <strong>최근 상태:</strong> {pipelineSummary?.status ? STATUS_LABELS[pipelineSummary.status] : "-"}
            </li>
            <li>
              <strong>실패 사유:</strong> {pipelineSummary?.error_reason ?? "-"}
            </li>
          </ul>
        </article>

        <article className="surface form-panel ops-utility-card">
          <div className="section-head compact">
            <div>
              <h3 className="section-title">QA Gate</h3>
            </div>
            <Image src="/assets/admin/stage-qa.svg" width={28} height={28} alt="" aria-hidden="true" />
          </div>

          {qualityLog ? (
            <ul className="bullet-list compact">
              {qualityRows.map((row) => (
                <li key={row.key}>
                  <strong>{row.label}</strong>:{" "}
                  {typeof row.ok === "boolean" ? (row.ok ? "PASS" : "FAIL") : "N/A"}
                  {typeof row.score === "number" ? ` (${row.score}${typeof row.threshold === "number" ? ` / ${row.threshold}` : ""})` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-text">게이트 리포트가 아직 없습니다.</p>
          )}

          {blockingReasons.length > 0 ? (
            <>
              <p className="muted-text" style={{ marginTop: 8 }}>
                차단 사유
              </p>
              <ul className="bullet-list compact">
                {blockingReasons.slice(0, 6).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </>
          ) : null}
        </article>

        <article className="surface form-panel ops-utility-card">
          <div className="section-head compact">
            <div>
              <h3 className="section-title">Release 상태</h3>
            </div>
            <Image src="/assets/admin/stage-release.svg" width={28} height={28} alt="" aria-hidden="true" />
          </div>
          <ul className="bullet-list compact">
            <li>
              <strong>현재 결과:</strong>{" "}
              {pipelineSummary?.status === "success" ? "Release 가능" : pipelineSummary?.status === "error" ? "Release 차단" : "진행중"}
            </li>
            <li>
              <strong>엔진 버전:</strong>{" "}
              {typeof qualityLog?.metadata?.generation_engine_version === "string"
                ? qualityLog.metadata.generation_engine_version
                : "scaffold_v3"}
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
