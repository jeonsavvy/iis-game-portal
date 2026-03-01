import type { PipelineControlAction, PipelineStage, PipelineStatus } from "@/types/pipeline";

export type AgentIcon = "analyzer" | "planner" | "designer" | "developer" | "qaRuntime" | "qaQuality" | "releaser" | "reporter";

export const AGENT_LAYOUT: Array<{
  stage: Exclude<PipelineStage, "done">;
  role: string;
  title: string;
  gridColumn: number;
  gridRow: number;
  icon: AgentIcon;
}> = [
  { stage: "analyze", role: "에이전트: 분석", title: "요청 해석", gridColumn: 1, gridRow: 1, icon: "analyzer" },
  { stage: "plan", role: "에이전트: 기획", title: "기획 확정", gridColumn: 2, gridRow: 1, icon: "planner" },
  { stage: "design", role: "에이전트: 디자인", title: "화면 설계", gridColumn: 3, gridRow: 1, icon: "designer" },
  { stage: "build", role: "에이전트: 개발", title: "게임 구현", gridColumn: 1, gridRow: 2, icon: "developer" },
  { stage: "qa_runtime", role: "에이전트: QA 런타임", title: "실행 안정성", gridColumn: 2, gridRow: 2, icon: "qaRuntime" },
  { stage: "qa_quality", role: "에이전트: QA 품질", title: "품질 평가", gridColumn: 3, gridRow: 2, icon: "qaQuality" },
  { stage: "release", role: "에이전트: 배포", title: "출시 반영", gridColumn: 1, gridRow: 3, icon: "releaser" },
  { stage: "report", role: "에이전트: 기록", title: "결과 보고", gridColumn: 2, gridRow: 3, icon: "reporter" },
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
  analyze: "요청을 분석해 제작 방향을 고정합니다.",
  plan: "코어 루프와 목표를 설계합니다.",
  design: "화면/연출 규칙을 설계합니다.",
  build: "실행 가능한 게임을 생성합니다.",
  qa_runtime: "런타임 오류를 점검합니다.",
  qa_quality: "품질 점검 후 개선과제를 큐에 적재합니다.",
  release: "게임을 배포 경로에 반영합니다.",
  report: "결과를 기록하고 다음 개선 입력으로 남깁니다.",
};

export const MOBILE_TABS = [
  { key: "board", label: "사무실 보드" },
  { key: "activity", label: "실시간 이벤트" },
  { key: "control", label: "실행" },
] as const;
