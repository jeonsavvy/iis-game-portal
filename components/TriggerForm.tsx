"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { sanitizeTriggerKeyword } from "@/lib/text/trigger-keyword";

type TriggerHistoryItem = {
  pipelineId: string;
  keyword: string;
  status: string;
  createdAt: string;
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
    keyword_too_short: "키워드를 입력해주세요.",
    keyword_too_long: "키워드는 200자 이하로 입력해주세요.",
    keyword_contains_control_characters: "키워드에 제어문자/숨김문자가 포함되어 있습니다. 다시 입력해주세요.",
    keyword_contains_unsupported_characters: "키워드에 지원되지 않는 문자가 포함되어 있습니다. 숨김문자 제거 후 다시 시도해주세요.",
    keyword_contains_blocked_term: "키워드에 금지된 단어가 포함되어 있습니다.",
    keyword_slug_generation_failed: "키워드 처리에 실패했습니다. 다른 키워드로 다시 시도해주세요.",
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

export function TriggerForm({
  onTriggered,
  className,
  controlPanel,
}: {
  onTriggered?: (item: TriggerHistoryItem) => void;
  className?: string;
  controlPanel?: ReactNode;
} = {}) {
  const [keyword, setKeyword] = useState("");
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
    const sanitizedKeyword = sanitizeTriggerKeyword(keyword);
    if (!sanitizedKeyword) {
      setStatus("실패: 키워드를 입력해주세요.");
      return;
    }
    if (sanitizedKeyword !== keyword) {
      setKeyword(sanitizedKeyword);
    }

    setStatus("요청 전송 중...");

    const response = await fetch("/api/pipelines/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: sanitizedKeyword,
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
        keyword: sanitizedKeyword,
        status: json.status,
        createdAt: new Date().toISOString(),
        pipelineVersion,
      },
      ...history,
    ].slice(0, 8);

    setHistory(updatedHistory);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
    onTriggered?.(updatedHistory[0]);

    setKeyword("");
  };

  return (
    <section className={`surface form-panel${className ? ` ${className}` : ""}`}>
      <div className="section-head compact">
        <div>
          <h3 className="section-title">직접 제어</h3>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="stack gap-sm">
        <input
          className="input"
          placeholder="예: 네온 퍼즐 스코어어택"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          required
          minLength={1}
          maxLength={200}
        />
        <label className="field">
          <span>파이프라인 버전</span>
          <input
            className="input"
            value={pipelineVersion}
            onChange={(event) => setPipelineVersion(event.target.value)}
            minLength={1}
            maxLength={40}
            required
          />
        </label>
        <button className="button button-primary button-block" type="submit">
          파이프라인 실행
        </button>
      </form>
      {status ? <p className="inline-feedback">{status}</p> : null}
      {controlPanel ?? null}

      {/* history logic removed based on user feedback to prevent static status confusion */}
    </section>
  );
}
