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

function parseErrorMessage(text: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: string; detail?: string };
    const errorValue = parsed.detail ?? parsed.error ?? text;
    return translateError(errorValue);
  } catch {
    return translateError(text);
  }
}

function translateError(errorText: string): string {
  const normalized = errorText.trim();
  if (!normalized) {
    return "알 수 없는 오류";
  }

  const map: Record<string, string> = {
    "CORE_ENGINE_URL is missing": "포털 서버에 CORE_ENGINE_URL 환경변수가 설정되지 않았습니다.",
    Unauthorized: "로그인이 필요합니다.",
    Forbidden: "권한이 없습니다.",
    "keyword is required": "키워드를 입력해주세요.",
    "Core engine unavailable": "코어 엔진(ForgeMind)에 연결할 수 없습니다.",
    unknown_error: "알 수 없는 오류",
  };

  return map[normalized] ?? normalized;
}

function statusLabel(value: string): string {
  const map: Record<string, string> = {
    queued: "대기",
    running: "실행중",
    success: "성공",
    error: "실패",
    retry: "재시도",
    skipped: "건너뜀",
    unknown: "알 수 없음",
  };
  return map[value] ?? value;
}

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
    setStatus("요청 전송 중...");

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
      setStatus(`실패: ${parseErrorMessage(text)}`);
      return;
    }

    const json = (await response.json()) as { pipeline_id: string; status: string };
    setStatus(`파이프라인이 등록되었습니다: ${json.pipeline_id} (${statusLabel(json.status)})`);

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
      <h3>ForgeFlow 실행</h3>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
        <input
          className="input"
          placeholder="예: 네온 퍼즐 스코어어택"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          required
          minLength={1}
          maxLength={200}
        />
        <label>
          실행 모드
          <select
            className="input"
            value={executionMode}
            onChange={(event) => setExecutionMode(event.target.value as "auto" | "manual")}
          >
            <option value="auto">자동 (auto)</option>
            <option value="manual">수동 (manual)</option>
          </select>
        </label>
        <label>
          파이프라인 버전
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
          파이프라인 실행
        </button>
      </form>
      {status ? <p>{status}</p> : null}

      {history.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <h4>최근 실행 이력</h4>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {history.map((item) => (
              <li key={item.pipelineId}>
                [{statusLabel(item.status)}] {item.keyword} (
                {item.executionMode === "manual" ? "수동" : "자동"}/{item.pipelineVersion}) (
                {new Date(item.createdAt).toLocaleTimeString()})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
