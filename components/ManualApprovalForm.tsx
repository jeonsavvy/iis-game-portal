"use client";

import { FormEvent, useEffect, useState } from "react";

const APPROVAL_STAGES = ["plan", "style", "build", "qa", "publish", "echo"] as const;

const STAGE_LABELS: Record<(typeof APPROVAL_STAGES)[number], string> = {
  plan: "기획",
  style: "스타일",
  build: "빌드",
  qa: "QA",
  publish: "게시",
  echo: "홍보(Echo)",
};

function parseErrorMessage(payload: { error?: string; detail?: string } | null): string {
  const raw = (payload?.detail ?? payload?.error ?? "unknown_error").trim();
  const map: Record<string, string> = {
    Unauthorized: "로그인이 필요합니다.",
    Forbidden: "권한이 없습니다.",
    "pipelineId is required": "파이프라인 ID를 입력해주세요.",
    "stage is invalid": "승인할 단계를 올바르게 선택해주세요.",
    "CORE_ENGINE_URL is missing": "포털 서버에 CORE_ENGINE_URL 환경변수가 설정되지 않았습니다.",
    "Core engine unavailable": "코어 엔진(ForgeMind)에 연결할 수 없습니다.",
    unknown_error: "알 수 없는 오류",
  };
  return map[raw] ?? raw;
}

export function ManualApprovalForm({
  defaultPipelineId,
  onApproved,
  className,
}: {
  defaultPipelineId?: string;
  onApproved?: (result: { pipelineId: string; stage: (typeof APPROVAL_STAGES)[number] }) => void;
  className?: string;
} = {}) {
  const [pipelineId, setPipelineId] = useState(defaultPipelineId ?? "");
  const [stage, setStage] = useState<(typeof APPROVAL_STAGES)[number]>("plan");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setPipelineId(defaultPipelineId ?? "");
  }, [defaultPipelineId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("요청 전송 중...");

    const response = await fetch("/api/pipelines/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineId, stage }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { status?: string; waiting_for_stage?: string | null; error?: string; detail?: string }
      | null;

    if (!response.ok) {
      setStatus(`실패: ${parseErrorMessage(payload)}`);
      return;
    }

    setStatus(
      `승인 완료: ${STAGE_LABELS[stage]} 단계 · 파이프라인 상태=${payload?.status ?? "unknown"} · 대기 단계=${payload?.waiting_for_stage ?? "-"}`,
    );
    onApproved?.({ pipelineId, stage });
  };

  return (
    <section className={`surface form-panel${className ? ` ${className}` : ""}`}>
      <div className="section-head compact">
        <div>
          <p className="eyebrow">수동 운영</p>
          <h3 className="section-title">단계 승인 콘솔</h3>
        </div>
        <p className="section-subtitle">manual 모드 파이프라인의 단계별 승인 요청을 전달합니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="stack gap-sm">
        <input
          className="input"
          placeholder="파이프라인 UUID"
          value={pipelineId}
          onChange={(event) => setPipelineId(event.target.value)}
          required
        />
        <label className="field">
          <span>단계</span>
          <select className="input" value={stage} onChange={(event) => setStage(event.target.value as (typeof APPROVAL_STAGES)[number])}>
            {APPROVAL_STAGES.map((value) => (
              <option key={value} value={value}>
                {STAGE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-primary button-block" type="submit">
          단계 승인
        </button>
      </form>
      {status ? <p className="inline-feedback">{status}</p> : null}
    </section>
  );
}
