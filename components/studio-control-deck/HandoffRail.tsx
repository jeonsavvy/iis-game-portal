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
        <h3 className="section-title">Handoff Rail</h3>
      </header>
      <ul>
        {ordered.length === 0 ? <li className="muted-text">전달 이벤트가 없습니다.</li> : null}
        {ordered.map((event) => (
          <li key={event.id} className="ops-collab-v2-rail-item">
            <div>
              <strong>
                {event.from_lane} → {event.to_lane}
              </strong>
              <p>{compactMessage(event.summary)}</p>
              {event.reason ? <small>reason: {event.reason}</small> : null}
            </div>
            <time>{new Date(event.created_at).toLocaleTimeString()}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}
