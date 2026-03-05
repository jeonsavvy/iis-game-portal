"use client";

import Image from "next/image";

import { TriggerForm } from "@/components/TriggerForm";
import { STAGE_LABELS, STATUS_LABELS } from "@/components/studio-control-deck/config";
import { compactMessage, compactReason } from "@/components/studio-control-deck/utils";
import type { PipelineControlAction, PipelineLog, PipelineSummary } from "@/types/pipeline";

type MobileTabKey = "board" | "control";

type UtilityShellProps = {
  mobileTab: MobileTabKey;
  previewMode: boolean;
  selectedPipelineId: string | null;
  selectedLogs: PipelineLog[];
  setSelectedPipelineId: (pipelineId: string | null) => void;
  setFeedback: (value: string) => void;
  recentFailures: PipelineLog[];
  pipelineSummary: PipelineSummary | null;
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

export function UtilityShell({
  mobileTab,
  previewMode,
  selectedPipelineId,
  selectedLogs,
  setSelectedPipelineId,
  setFeedback,
  recentFailures,
  pipelineSummary,
  controlAvailability,
  busyAction,
  runControl,
}: UtilityShellProps) {
  const qualityLog =
    selectedLogs.find((log) => Boolean(log.metadata?.quality_gate_report)) ??
    selectedLogs.find((log) => Boolean(log.metadata?.intent_gate_report)) ??
    selectedLogs.find((log) => Array.isArray(log.metadata?.blocking_reasons)) ??
    selectedLogs.find((log) => Array.isArray(log.metadata?.quality_floor_fail_reasons)) ??
    null;
  const qualityReport = qualityLog?.metadata?.quality_gate_report;
  const visualMetrics =
    qualityReport && typeof qualityReport.visual_metrics === "object" && qualityReport.visual_metrics !== null
      ? qualityReport.visual_metrics
      : null;
  const intentGateReport = qualityLog?.metadata?.intent_gate_report;
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
  const intentBlockingReasons = Array.isArray(intentGateReport?.failed_items)
    ? intentGateReport.failed_items.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const usageLog = selectedLogs.find((log) => typeof log.metadata?.usage?.total_tokens === "number") ?? qualityLog;
  const usage = usageLog?.metadata?.usage;
  const latestErrorLog = selectedLogs.find((log) => log.status === "error") ?? null;
  const detailedErrorReason = compactReason(
    (typeof latestErrorLog?.metadata?.upstream_reason === "string" && latestErrorLog.metadata.upstream_reason) ||
      (typeof latestErrorLog?.metadata?.vertex_error === "string" && latestErrorLog.metadata.vertex_error) ||
      null,
    140,
  );
  const synapseContract = qualityLog?.metadata?.synapse_contract;
  const synapseHash =
    typeof qualityLog?.metadata?.synapse_contract_hash === "string" ? qualityLog.metadata.synapse_contract_hash : null;
  const synapseEngine =
    synapseContract && typeof synapseContract.runtime_contract?.engine_mode === "string"
      ? synapseContract.runtime_contract.engine_mode
      : null;
  const preflightReport = qualityLog?.metadata?.builder_preflight_report;
  const runtimeCompiler = qualityLog?.metadata?.runtime_compiler;
  const assetUsageReport = qualityLog?.metadata?.asset_usage_report;
  const summarizedReason = compactReason(pipelineSummary?.error_reason, 120);

  return (
    <section className={`surface ops-utility-shell ops-pane ${mobileTab === "control" ? "is-active" : ""}`}>
      <div className="ops-utility-grid">
        {previewMode ? (
          <article className="surface form-panel ops-utility-card">
            <div className="section-head compact">
              <div>
                <h3 className="section-title">직접 제어</h3>
              </div>
            </div>
            <p className="muted-text">프리뷰 모드에서는 실제 트리거/제어 요청을 전송하지 않습니다.</p>
            <p className="inline-feedback">직접 제어 영역은 시뮬레이션 피드백만 제공합니다.</p>
          </article>
        ) : (
          <TriggerForm
            className="ops-utility-card"
            controlPanel={
              <div className="ops-workbench-actions" style={{ marginTop: 10 }}>
                {(["pause", "resume", "cancel", "retry"] as PipelineControlAction[]).map((action) => (
                  <button
                    key={action}
                    className={`button ${action === "cancel" ? "button-danger" : action === "resume" ? "button-primary" : "button-ghost"}`}
                    type="button"
                    title={!controlAvailability[action].enabled ? controlAvailability[action].reason : undefined}
                    disabled={!selectedPipelineId || busyAction !== null || !controlAvailability[action].enabled}
                    onClick={() => void runControl(action)}
                  >
                    {busyAction === action ? "처리중..." : action === "retry" ? "재시도" : action === "pause" ? "일시정지" : action === "resume" ? "재개" : "중단"}
                  </button>
                ))}
              </div>
            }
            onTriggered={(item) => {
              setSelectedPipelineId(item.pipelineId);
              setFeedback(`신규 파이프라인 등록: ${item.pipelineId}`);
            }}
          />
        )}

        <article className="surface form-panel ops-utility-card">
          <div className="section-head compact">
            <div>
              <h3 className="section-title">실행/실패 상태</h3>
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
              <strong>실패 사유:</strong>{" "}
              <span className="ops-error-reason" title={pipelineSummary?.error_reason ?? undefined}>
                {summarizedReason ?? "-"}
              </span>
            </li>
            {detailedErrorReason ? (
              <li>
                <strong>상세 사유:</strong>{" "}
                <span className="ops-error-reason" title={detailedErrorReason}>
                  {detailedErrorReason}
                </span>
              </li>
            ) : null}
          </ul>
          {recentFailures.length === 0 ? (
            <p className="muted-text">최근 실패가 없습니다.</p>
          ) : (
            <>
              <p className="muted-text" style={{ marginTop: 8 }}>
                최근 실패 내역
              </p>
              <ul className="bullet-list compact">
                {recentFailures.map((log) => (
                  <li key={`${log.pipeline_id}-${log.id ?? log.created_at}-failure`}>
                    <strong>{STAGE_LABELS[log.stage]}:</strong> {compactMessage(log.reason ?? log.message)}
                  </li>
                ))}
              </ul>
            </>
          )}
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
                {blockingReasons.slice(0, 5).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </>
          ) : null}

          {intentGateReport ? (
            <>
              <p className="muted-text" style={{ marginTop: 8 }}>
                의도 게이트
              </p>
              <ul className="bullet-list compact">
                <li>
                  <strong>Intent</strong>: {intentGateReport.ok ? "PASS" : "FAIL"}
                  {typeof intentGateReport.score === "number"
                    ? ` (${intentGateReport.score}${typeof intentGateReport.threshold === "number" ? ` / ${intentGateReport.threshold}` : ""})`
                    : ""}
                </li>
                {intentBlockingReasons.slice(0, 4).map((reason) => (
                  <li key={`intent-${reason}`}>{reason}</li>
                ))}
              </ul>
            </>
          ) : null}

          {synapseHash || synapseEngine ? (
            <>
              <p className="muted-text" style={{ marginTop: 8 }}>
                Synapse 계약
              </p>
              <ul className="bullet-list compact">
                {synapseEngine ? (
                  <li>
                    <strong>Engine</strong>: {synapseEngine}
                  </li>
                ) : null}
                {synapseHash ? (
                  <li>
                    <strong>Hash</strong>: {synapseHash.slice(0, 12)}
                  </li>
                ) : null}
              </ul>
            </>
          ) : null}

          {usage ? (
            <>
              <p className="muted-text" style={{ marginTop: 8 }}>
                토큰/비용
              </p>
              <ul className="bullet-list compact">
                <li>
                  <strong>Prompt</strong>: {typeof usage.prompt_tokens === "number" ? usage.prompt_tokens.toLocaleString() : "-"}
                </li>
                <li>
                  <strong>Completion</strong>: {typeof usage.completion_tokens === "number" ? usage.completion_tokens.toLocaleString() : "-"}
                </li>
                <li>
                  <strong>Total</strong>: {typeof usage.total_tokens === "number" ? usage.total_tokens.toLocaleString() : "-"}
                </li>
                <li>
                  <strong>Cost</strong>: {typeof usage.estimated_cost_usd === "number" ? `$${usage.estimated_cost_usd.toFixed(4)}` : "-"}
                </li>
              </ul>
            </>
          ) : null}

          {preflightReport ? (
            <>
              <p className="muted-text" style={{ marginTop: 8 }}>
                Builder Preflight
              </p>
              <ul className="bullet-list compact">
                <li>
                  <strong>선택</strong>: {preflightReport.selection_reason ?? "-"}
                </li>
                <li>
                  <strong>RAW</strong>:{" "}
                  {typeof preflightReport.raw?.builder === "number"
                    ? `B ${preflightReport.raw.builder} / V ${preflightReport.raw.visual ?? "-"}`
                    : "-"}
                </li>
                <li>
                  <strong>FIXED</strong>:{" "}
                  {typeof preflightReport.fixed?.builder === "number"
                    ? `B ${preflightReport.fixed.builder} / V ${preflightReport.fixed.visual ?? "-"}`
                    : "-"}
                </li>
              </ul>
            </>
          ) : null}

          {runtimeCompiler ? (
            <>
              <p className="muted-text" style={{ marginTop: 8 }}>
                Runtime Compiler
              </p>
              <ul className="bullet-list compact">
                <li>
                  <strong>Transforms</strong>:{" "}
                  {Array.isArray(runtimeCompiler.transforms_applied) && runtimeCompiler.transforms_applied.length > 0
                    ? runtimeCompiler.transforms_applied.slice(0, 4).join(", ")
                    : "-"}
                </li>
              </ul>
            </>
          ) : null}

          {assetUsageReport ? (
            <>
              <p className="muted-text" style={{ marginTop: 8 }}>
                Asset Usage
              </p>
              <ul className="bullet-list compact">
                <li>
                  <strong>Used</strong>:{" "}
                  {typeof assetUsageReport.asset_usage_count === "number" ? assetUsageReport.asset_usage_count : "-"}
                </li>
                <li>
                  <strong>Keys</strong>:{" "}
                  {Array.isArray(assetUsageReport.used_asset_keys) && assetUsageReport.used_asset_keys.length > 0
                    ? assetUsageReport.used_asset_keys.slice(0, 5).join(", ")
                    : "-"}
                </li>
              </ul>
            </>
          ) : null}

          {visualMetrics ? (
            <>
              <p className="muted-text" style={{ marginTop: 8 }}>
                Visual Metrics
              </p>
              <ul className="bullet-list compact">
                <li>
                  <strong>contrast</strong>: {typeof visualMetrics.luminance_std === "number" ? visualMetrics.luminance_std.toFixed(2) : "-"}
                </li>
                <li>
                  <strong>diversity</strong>: {typeof visualMetrics.color_bucket_count === "number" ? visualMetrics.color_bucket_count : "-"}
                </li>
                <li>
                  <strong>edge</strong>: {typeof visualMetrics.edge_energy === "number" ? visualMetrics.edge_energy.toFixed(4) : "-"}
                </li>
                <li>
                  <strong>motion</strong>:{" "}
                  {typeof visualMetrics.motion_delta === "number"
                    ? visualMetrics.motion_delta.toFixed(6)
                    : typeof visualMetrics.motion_delta_p90 === "number"
                      ? visualMetrics.motion_delta_p90.toFixed(6)
                      : "-"}
                </li>
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
