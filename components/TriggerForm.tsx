"use client";

import { FormEvent, useEffect, useState } from "react";

type TriggerHistoryItem = {
  pipelineId: string;
  keyword: string;
  status: string;
  createdAt: string;
  executionMode: "auto" | "manual";
  pipelineVersion: string;
};

const HISTORY_STORAGE_KEY = "iis:trigger-history";

export function TriggerForm() {
  const [keyword, setKeyword] = useState("");
  const [executionMode, setExecutionMode] = useState<"auto" | "manual">("auto");
  const [pipelineVersion, setPipelineVersion] = useState("forgeflow-v1");
  const [status, setStatus] = useState<string>("");
  const [history, setHistory] = useState<TriggerHistoryItem[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Array<Partial<TriggerHistoryItem>>;
      const normalized: TriggerHistoryItem[] = parsed
        .map((item) => ({
          pipelineId: item.pipelineId ?? "",
          keyword: item.keyword ?? "",
          status: item.status ?? "unknown",
          createdAt: item.createdAt ?? new Date(0).toISOString(),
          executionMode: (item.executionMode === "manual" ? "manual" : "auto") as TriggerHistoryItem["executionMode"],
          pipelineVersion: item.pipelineVersion?.trim() || "forgeflow-v1",
        }))
        .filter((item) => item.pipelineId.length > 0);
      setHistory(normalized);
    } catch {
      setHistory([]);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Submitting...");

    const response = await fetch("/api/pipelines/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword,
        execution_mode: executionMode,
        pipeline_version: pipelineVersion,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      setStatus(`Failed: ${text}`);
      return;
    }

    const json = (await response.json()) as { pipeline_id: string; status: string };
    setStatus(`Queued pipeline ${json.pipeline_id} (${json.status})`);

    const updatedHistory: TriggerHistoryItem[] = [
      {
        pipelineId: json.pipeline_id,
        keyword,
        status: json.status,
        createdAt: new Date().toISOString(),
        executionMode,
        pipelineVersion,
      },
      ...history,
    ].slice(0, 8);

    setHistory(updatedHistory);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));

    setKeyword("");
  };

  return (
    <section className="card">
      <h3>Trigger ForgeFlow</h3>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
        <input
          className="input"
          placeholder="e.g. neon puzzle score attack"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          required
          minLength={1}
          maxLength={200}
        />
        <label>
          Execution Mode
          <select
            className="input"
            value={executionMode}
            onChange={(event) => setExecutionMode(event.target.value as "auto" | "manual")}
          >
            <option value="auto">auto</option>
            <option value="manual">manual</option>
          </select>
        </label>
        <label>
          Pipeline Version
          <input
            className="input"
            value={pipelineVersion}
            onChange={(event) => setPipelineVersion(event.target.value)}
            minLength={1}
            maxLength={40}
            required
          />
        </label>
        <button className="button" type="submit">
          Run Pipeline
        </button>
      </form>
      {status ? <p>{status}</p> : null}

      {history.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <h4>Recent Triggers</h4>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {history.map((item) => (
              <li key={item.pipelineId}>
                [{item.status}] {item.keyword} ({item.executionMode}/{item.pipelineVersion}) (
                {new Date(item.createdAt).toLocaleTimeString()})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
