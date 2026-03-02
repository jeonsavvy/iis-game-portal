import type { PipelineControlAction, PipelineStage, PipelineStatus } from "@/types/pipeline";

export type AgentIcon = "analyzer" | "planner" | "designer" | "developer" | "qaRuntime" | "qaQuality" | "releaser" | "reporter";

export const AGENT_LAYOUT: Array<{
  stage: Exclude<PipelineStage, "done">;
  role: string;
  gridColumn: number;
  gridRow: number;
  icon: AgentIcon;
}> = [
  { stage: "analyze", role: "분석", gridColumn: 1, gridRow: 1, icon: "analyzer" },
  { stage: "plan", role: "기획", gridColumn: 2, gridRow: 1, icon: "planner" },
  { stage: "design", role: "디자인", gridColumn: 3, gridRow: 1, icon: "designer" },
  { stage: "build", role: "개발", gridColumn: 1, gridRow: 2, icon: "developer" },
  { stage: "qa_runtime", role: "QA 런타임", gridColumn: 2, gridRow: 2, icon: "qaRuntime" },
  { stage: "qa_quality", role: "QA 품질", gridColumn: 3, gridRow: 2, icon: "qaQuality" },
  { stage: "release", role: "배포", gridColumn: 1, gridRow: 3, icon: "releaser" },
  { stage: "report", role: "기록", gridColumn: 2, gridRow: 3, icon: "reporter" },
];

export const STATUS_LABELS: Record<PipelineStatus, string> = {
  queued: "대기",
  running: "동작중",
  success: "완료",
  error: "실패",
  retry: "재시도",
  skipped: "일시정지",
};

export const CONTROL_LABELS: Record<PipelineControlAction, string> = {
  pause: "일시정지",
  resume: "재개",
  cancel: "중단",
  retry: "재시도",
};

export const STAGE_LABELS: Record<PipelineStage, string> = {
  analyze: "분석",
  plan: "기획",
  design: "디자인",
  build: "개발",
  qa_runtime: "QA 런타임",
  qa_quality: "QA 품질",
  release: "배포",
  report: "기록",
  done: "완료",
};

export const AGENT_LABELS: Record<string, string> = {
  analyzer: "분석",
  planner: "기획",
  designer: "디자인",
  developer: "개발",
  qa_runtime: "QA 런타임",
  qa_quality: "QA 품질",
  releaser: "배포",
  reporter: "기록",
};

export const STAGE_GUIDE: Record<Exclude<PipelineStage, "done">, string> = {
  analyze: "요청 분석",
  plan: "플레이 설계",
  design: "화면 설계",
  build: "게임 구현",
  qa_runtime: "실행 점검",
  qa_quality: "품질 점검",
  release: "배포 반영",
  report: "결과 기록",
};

export const MOBILE_TABS = [
  { key: "board", label: "보드" },
  { key: "activity", label: "로그" },
  { key: "control", label: "제어" },
] as const;
