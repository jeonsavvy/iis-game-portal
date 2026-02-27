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
  { stage: "trigger", role: "디렉터", title: "Scout", gridColumn: 1, gridRow: 1, icon: "scout" },
  { stage: "plan", role: "아키텍트", title: "Intel", gridColumn: 2, gridRow: 1, icon: "intel" },
  { stage: "build", role: "빌더", title: "Builder", gridColumn: 3, gridRow: 1, icon: "builder" },
  { stage: "style", role: "스타일리스트", title: "Stylist", gridColumn: 1, gridRow: 2, icon: "stylist" },
  { stage: "qa", role: "센티널", title: "Sentinel", gridColumn: 2, gridRow: 2, icon: "sentinel" },
  { stage: "publish", role: "퍼블리셔", title: "Outreach", gridColumn: 3, gridRow: 2, icon: "publisher" },
  { stage: "echo", role: "에코", title: "Closer", gridColumn: 2, gridRow: 3, icon: "echo" },
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
  trigger: "트리거",
  plan: "기획",
  style: "스타일",
  build: "빌드",
  qa: "QA",
  publish: "게시",
  echo: "홍보",
  done: "완료",
};

export const AGENT_LABELS: Record<string, string> = {
  Trigger: "트리거",
  Architect: "아키텍트",
  Stylist: "스타일리스트",
  Builder: "빌더",
  Sentinel: "센티널",
  Publisher: "퍼블리셔",
  Echo: "에코",
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
    summary: "유저 키워드를 해석해 목표 장르/톤/제약을 확정합니다.",
    handoff: "기획 브리프를 Architect로 전달",
    focus: "입력 품질, 금칙어, 목적 정렬",
  },
  plan: {
    summary: "기획서/레퍼런스/구현 범위를 결정합니다.",
    handoff: "스타일 시스템 요구사항을 Stylist로 전달",
    focus: "요구사항 정확도, 범위 잠금",
  },
  style: {
    summary: "디자인 토큰과 컴포넌트 계약을 생성합니다.",
    handoff: "빌드 가능한 스타일 규격을 Builder에 전달",
    focus: "시각 일관성, 컴포넌트 계약",
  },
  build: {
    summary: "게임 아티팩트와 UI 코드를 빌드합니다.",
    handoff: "검증 가능한 산출물을 Sentinel에 전달",
    focus: "실행 가능 산출물, 의존성 무결성",
  },
  qa: {
    summary: "플레이 테스트, 품질 게이트, 스크린샷 검수를 수행합니다.",
    handoff: "게시 승인 패키지를 Publisher로 전달",
    focus: "결함 검출, 재시도 필요성",
  },
  publish: {
    summary: "배포/스토리지/아카이브를 동기화합니다.",
    handoff: "최종 공지 컨텍스트를 Echo에 전달",
    focus: "배포 상태, 링크 유효성",
  },
  echo: {
    summary: "최종 결과를 공지하고 운영 채널에 상태를 남깁니다.",
    handoff: "파이프라인 종료 보고",
    focus: "커뮤니케이션 완결성",
  },
};

export const MOBILE_TABS = [
  { key: "board", label: "협업보드" },
  { key: "activity", label: "라이브로그" },
  { key: "control", label: "실행/승인" },
] as const;

