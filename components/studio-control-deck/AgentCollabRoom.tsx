"use client";

import { STATUS_LABELS, STAGE_LABELS } from "@/components/studio-control-deck/config";
import { compactMessage, statusTone } from "@/components/studio-control-deck/utils";
import type { AgentThreadEvent, PipelineStage } from "@/types/pipeline";

type AgentCollabRoomProps = {
  thread: AgentThreadEvent[];
  selectedStage: Exclude<PipelineStage, "done">;
  onSelectStage: (stage: Exclude<PipelineStage, "done">) => void;
};

function toDisplayRows(thread: AgentThreadEvent[], lane: "A" | "B"): AgentThreadEvent[] {
  return thread
    .filter((event) => event.lane === lane)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 14);
}

export function AgentCollabRoom({ thread, selectedStage, onSelectStage }: AgentCollabRoomProps) {
  const laneA = toDisplayRows(thread, "A");
  const laneB = toDisplayRows(thread, "B");

  return (
    <section className="surface ops-collab-v2-room">
      <header className="ops-collab-v2-head">
        <h3 className="section-title">A/B 협업 대화실</h3>
      </header>

      <div className="ops-collab-v2-lanes">
        <article className="ops-collab-v2-lane">
          <header>
            <strong>A 생성기</strong>
            <span className="muted-text">분석 → 기획 → 디자인 → 개발</span>
          </header>
          <ul>
            {laneA.length === 0 ? <li className="muted-text">A lane 로그가 없습니다.</li> : null}
            {laneA.map((event) => {
              const tone = statusTone(event.status);
              const selectable = event.stage !== "done";
              const selected = selectable && selectedStage === event.stage;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    className={`ops-collab-v2-bubble tone-${tone}${selected ? " is-selected" : ""}`}
                    onClick={() => {
                      if (selectable) onSelectStage(event.stage as Exclude<PipelineStage, "done">);
                    }}
                    disabled={!selectable}
                  >
                    <div className="ops-collab-v2-bubble-head">
                      <span>{STAGE_LABELS[event.stage]}</span>
                      <span className={`status-chip tone-${tone}`}>{STATUS_LABELS[event.status]}</span>
                    </div>
                    <p>{compactMessage(event.message)}</p>
                    {event.reason ? <small>reason: {event.reason}</small> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="ops-collab-v2-lane">
          <header>
            <strong>B 검증·출시</strong>
            <span className="muted-text">QA 런타임 → QA 품질 → 배포 → 기록</span>
          </header>
          <ul>
            {laneB.length === 0 ? <li className="muted-text">B lane 로그가 없습니다.</li> : null}
            {laneB.map((event) => {
              const tone = statusTone(event.status);
              const selectable = event.stage !== "done";
              const selected = selectable && selectedStage === event.stage;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    className={`ops-collab-v2-bubble tone-${tone}${selected ? " is-selected" : ""}`}
                    onClick={() => {
                      if (selectable) onSelectStage(event.stage as Exclude<PipelineStage, "done">);
                    }}
                    disabled={!selectable}
                  >
                    <div className="ops-collab-v2-bubble-head">
                      <span>{STAGE_LABELS[event.stage]}</span>
                      <span className={`status-chip tone-${tone}`}>{STATUS_LABELS[event.status]}</span>
                    </div>
                    <p>{compactMessage(event.message)}</p>
                    {event.reason ? <small>reason: {event.reason}</small> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </section>
  );
}
