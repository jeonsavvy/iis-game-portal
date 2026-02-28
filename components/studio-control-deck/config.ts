import type { PipelineControlAction, PipelineStage, PipelineStatus } from "@/types/pipeline";

export type AgentIcon = "scout" | "intel" | "stylist" | "builder" | "sentinel" | "publisher" | "echo";

export const AGENT_LAYOUT: Array<{
  stage: Exclude<PipelineStage, "done">;
  role: string;
  title: string;
  gridColumn: number;
  gridRow: number;
  icon: AgentIcon;
}> = [
  { stage: "trigger", role: "에이전트: 분석", title: "요청 정리", gridColumn: 1, gridRow: 1, icon: "scout" },
  { stage: "plan", role: "에이전트: 기획", title: "기획 확정", gridColumn: 2, gridRow: 1, icon: "intel" },
  { stage: "build", role: "에이전트: 개발", title: "게임 구현", gridColumn: 3, gridRow: 1, icon: "builder" },
  { stage: "style", role: "에이전트: 디자인", title: "화면 구성", gridColumn: 1, gridRow: 2, icon: "stylist" },
  { stage: "qa", role: "에이전트: QA", title: "품질 검사", gridColumn: 2, gridRow: 2, icon: "sentinel" },
  { stage: "publish", role: "에이전트: 배포", title: "출시 반영", gridColumn: 3, gridRow: 2, icon: "publisher" },
  { stage: "echo", role: "에이전트: 기록", title: "결과 기록", gridColumn: 2, gridRow: 3, icon: "echo" },
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
  trigger: "분석",
  plan: "기획",
  style: "디자인",
  build: "개발",
  qa: "QA",
  publish: "배포",
  echo: "기록",
  done: "완료",
};

export const AGENT_LABELS: Record<string, string> = {
  Trigger: "분석",
  Architect: "기획",
  Stylist: "디자인",
  Builder: "개발",
  Sentinel: "QA",
  Publisher: "배포",
  Echo: "기록",
};

export const STAGE_GUIDE: Record<
  Exclude<PipelineStage, "done">,
  string
> = {
  trigger: "입력 요청을 해석하고 작업 목표를 정리합니다.",
  plan: "게임 구조와 범위를 확정합니다.",
  style: "화면 규칙과 시각 방향을 정리합니다.",
  build: "플레이 가능한 결과물을 만듭니다.",
  qa: "실행 오류와 품질 기준을 검사합니다.",
  publish: "결과물을 서비스/아카이브에 반영합니다.",
  echo: "최종 결과를 기록하고 종료합니다.",
};

export const MOBILE_TABS = [
  { key: "board", label: "에이전트" },
  { key: "activity", label: "로그" },
  { key: "control", label: "실행" },
] as const;
