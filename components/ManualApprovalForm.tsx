"use client";

import { FormEvent, useState } from "react";

const APPROVAL_STAGES = ["plan", "style", "build", "qa", "publish", "echo"] as const;

export function ManualApprovalForm() {
  const [pipelineId, setPipelineId] = useState("");
  const [stage, setStage] = useState<(typeof APPROVAL_STAGES)[number]>("plan");
  const [status, setStatus] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Submitting...");

    const response = await fetch("/api/pipelines/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineId, stage }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { status?: string; waiting_for_stage?: string | null; error?: string; detail?: string }
      | null;

    if (!response.ok) {
      setStatus(`Failed: ${payload?.detail ?? payload?.error ?? "unknown_error"}`);
      return;
    }

    setStatus(`Approved '${stage}'. Pipeline status=${payload?.status ?? "unknown"}, waiting=${payload?.waiting_for_stage ?? "-"}`);
  };

  return (
    <section className="card">
      <h3>Manual Stage Approval</h3>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
        <input
          className="input"
          placeholder="pipeline UUID"
          value={pipelineId}
          onChange={(event) => setPipelineId(event.target.value)}
          required
        />
        <label>
          Stage
          <select className="input" value={stage} onChange={(event) => setStage(event.target.value as (typeof APPROVAL_STAGES)[number])}>
            {APPROVAL_STAGES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="submit">
          Approve Stage
        </button>
      </form>
      {status ? <p>{status}</p> : null}
    </section>
  );
}
