"use client";

import { compactMessage } from "@/components/studio-control-deck/utils";
import type { HandoffEvent } from "@/types/pipeline";

type HandoffRailProps = {
  events: HandoffEvent[];
};

export function HandoffRail({ events }: HandoffRailProps) {
  const ordered = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 14);
  return (
    <section className="surface ops-collab-v2-rail">
      <header className="ops-collab-v2-head">
        <h3 className="section-title">협업 진행선</h3>
      </header>
      <ul>
        {ordered.length === 0 ? <li className="muted-text">협업 전달 기록이 아직 없습니다.</li> : null}
        {ordered.map((event) => (
          <li key={event.id} className="ops-collab-v2-rail-item">
            <div>
              <strong>
                {event.from_lane === "A" ? "에이전트A" : event.from_lane === "B" ? "에이전트B" : "시스템"} →{" "}
                {event.to_lane === "A" ? "에이전트A" : event.to_lane === "B" ? "에이전트B" : "시스템"}
              </strong>
              <p>{compactMessage(event.summary)}</p>
              {event.reason ? <small>메모: {event.reason}</small> : null}
            </div>
            <time>{new Date(event.created_at).toLocaleTimeString()}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}
