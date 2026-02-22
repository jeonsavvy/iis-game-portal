import type { AppRole } from "@/types/database";

export function RoleActions({ role }: { role: AppRole }) {
  return (
    <section className="card admin-actions">
      <h3>Master Admin Controls</h3>
      <p>Single-operator mode is active. ({role})</p>
      <button className="button" disabled type="button">
        Replay Failed Pipelines (Planned)
      </button>
      <button className="button" disabled type="button">
        Rotate Integration Keys (Planned)
      </button>
    </section>
  );
}
