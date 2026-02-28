"use client";

import { STAGE_LABELS, STATUS_LABELS } from "@/components/studio-control-deck/config";
import { compactMessage, qualitySignals, statusTone } from "@/components/studio-control-deck/utils";
import type { PipelineLog } from "@/types/pipeline";

type MobileTabKey = "board" | "activity" | "control";

type MobileActivityPaneProps = {
  mobileTab: MobileTabKey;
  selectedLogs: PipelineLog[];
};

export function MobileActivityPane({ mobileTab, selectedLogs }: MobileActivityPaneProps) {
  return (
    <section className={`surface ops-mobile-log-pane ops-pane ${mobileTab === "activity" ? "is-active" : ""}`}>
      <div className="section-head compact">
        <div>
          <h3 className="section-title">로그</h3>
        </div>
        <span className="muted-text">{selectedLogs.length}개 로그</span>
      </div>
      <ul className="activity-list">
        {selectedLogs.length === 0 ? <li className="muted-text">선택된 파이프라인 로그가 없습니다.</li> : null}
        {selectedLogs.slice(0, 18).map((log) => {
          const signals = qualitySignals(log);
          return (
            <li key={`${log.pipeline_id}-${log.id ?? log.created_at}-${log.stage}`}>
              <span className={`status-chip tone-${statusTone(log.status)}`}>{STATUS_LABELS[log.status]}</span>
              <div className="activity-main">
                <strong>{STAGE_LABELS[log.stage]}</strong> · {compactMessage(log.message)}
                {(signals.fatal > 0 || signals.warning > 0) && (
                  <span className="activity-metrics">
                    치명 {signals.fatal} · 경고 {signals.warning}
                  </span>
                )}
              </div>
              <span className="activity-time">{new Date(log.created_at).toLocaleTimeString()}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
