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
  { stage: "trigger", role: "입력 분석", title: "요청 해석", gridColumn: 1, gridRow: 1, icon: "scout" },
  { stage: "plan", role: "기획 설계", title: "설계 확정", gridColumn: 2, gridRow: 1, icon: "intel" },
  { stage: "build", role: "게임 제작", title: "핵심 구현", gridColumn: 3, gridRow: 1, icon: "builder" },
  { stage: "style", role: "화면 연출", title: "시각 구성", gridColumn: 1, gridRow: 2, icon: "stylist" },
  { stage: "qa", role: "품질 점검", title: "자동 검수", gridColumn: 2, gridRow: 2, icon: "sentinel" },
  { stage: "publish", role: "배포 반영", title: "서비스 배포", gridColumn: 3, gridRow: 2, icon: "publisher" },
  { stage: "echo", role: "결과 보고", title: "완료 리포트", gridColumn: 2, gridRow: 3, icon: "echo" },
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
  trigger: "요청",
  plan: "설계",
  style: "연출",
  build: "제작",
  qa: "검수",
  publish: "배포",
  echo: "보고",
  done: "완료",
};

export const AGENT_LABELS: Record<string, string> = {
  Trigger: "입력 분석",
  Architect: "기획 설계",
  Stylist: "화면 연출",
  Builder: "게임 제작",
  Sentinel: "품질 점검",
  Publisher: "배포 반영",
  Echo: "결과 보고",
};

export const STAGE_GUIDE: Record<
  Exclude<PipelineStage, "done">,
  {
    summary: string;
    handoff: string;
    focus: string;
  }
> = {
  trigger: {
    summary: "요청 키워드를 해석해 제작 목표·장르·제약을 정리합니다.",
    handoff: "정리된 요구사항을 설계 단계로 전달",
    focus: "입력 품질, 금칙어, 목적 일치",
  },
  plan: {
    summary: "게임 규칙과 구현 범위를 확정합니다.",
    handoff: "화면 연출 요구사항을 연출 단계로 전달",
    focus: "규칙 명확성, 범위 확정",
  },
  style: {
    summary: "색상·폰트·레이아웃 규칙을 정리합니다.",
    handoff: "구현 가능한 UI 명세를 제작 단계로 전달",
    focus: "시각 일관성, 가독성",
  },
  build: {
    summary: "실행 가능한 게임 코드를 생성합니다.",
    handoff: "검수 가능한 산출물을 품질 점검 단계로 전달",
    focus: "실행 가능성, 오류 최소화",
  },
  qa: {
    summary: "실행/품질/시각 점검을 자동으로 수행합니다.",
    handoff: "배포 가능한 결과를 배포 단계로 전달",
    focus: "결함 탐지, 재시도 판단",
  },
  publish: {
    summary: "스토리지·아카이브·메타데이터를 동기화합니다.",
    handoff: "최종 결과를 보고 단계로 전달",
    focus: "배포 상태, 링크 유효성",
  },
  echo: {
    summary: "최종 결과를 운영 로그로 정리합니다.",
    handoff: "파이프라인 종료",
    focus: "결과 요약, 추적 가능성",
  },
};

export const MOBILE_TABS = [
  { key: "board", label: "작업 보드" },
  { key: "activity", label: "실시간 로그" },
  { key: "control", label: "실행 제어" },
] as const;
