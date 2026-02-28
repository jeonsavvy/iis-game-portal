"use client";

import { TriggerForm } from "@/components/TriggerForm";
import { STAGE_LABELS, STATUS_LABELS } from "@/components/studio-control-deck/config";
import { compactMessage } from "@/components/studio-control-deck/utils";
import type { PipelineLog, PipelineSummary } from "@/types/pipeline";

type MobileTabKey = "board" | "activity" | "control";

type UtilityShellProps = {
  mobileTab: MobileTabKey;
  previewMode: boolean;
  selectedPipelineId: string | null;
  setSelectedPipelineId: (pipelineId: string | null) => void;
  setFeedback: (value: string) => void;
  recentFailures: PipelineLog[];
  pipelineSummary: PipelineSummary | null;
};

export function UtilityShell({
  mobileTab,
  previewMode,
  selectedPipelineId,
  setSelectedPipelineId,
  setFeedback,
  recentFailures,
  pipelineSummary,
}: UtilityShellProps) {
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
              <h3 className="section-title">상태</h3>
            </div>
          </div>

          <ul className="bullet-list compact">
            <li>
              <strong>현재 파이프라인:</strong> {selectedPipelineId ? selectedPipelineId.slice(0, 12) : "-"}
            </li>
            <li>
              <strong>대기 단계:</strong> {pipelineSummary?.waiting_for_stage ? STAGE_LABELS[pipelineSummary.waiting_for_stage] : "-"}
            </li>
            <li>
              <strong>최근 상태:</strong> {pipelineSummary?.status ? STATUS_LABELS[pipelineSummary.status] : "-"}
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
