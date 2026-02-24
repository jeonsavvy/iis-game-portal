export type AgentName =
  | "Trigger"
  | "Architect"
  | "Stylist"
  | "Builder"
  | "Sentinel"
  | "Publisher"
  | "Echo";

export type PipelineStage =
  | "trigger"
  | "plan"
  | "style"
  | "build"
  | "qa"
  | "publish"
  | "echo"
  | "done";

export type PipelineStatus = "queued" | "running" | "success" | "error" | "retry" | "skipped";
export type PipelineControlAction = "pause" | "resume" | "cancel" | "retry";

export type PipelineLog = {
  id?: number;
  pipeline_id: string;
  stage: PipelineStage;
  status: PipelineStatus;
  agent_name: AgentName;
  message: string;
  reason: string | null;
  attempt: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PipelineSummary = {
  pipeline_id: string;
  keyword: string;
  source: "telegram" | "console";
  status: PipelineStatus;
  execution_mode: "auto" | "manual";
  waiting_for_stage: PipelineStage | null;
  pipeline_version: string;
  error_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type PipelineControlResponse = {
  pipeline_id: string;
  action: PipelineControlAction;
  execution_mode: "auto" | "manual";
  status: PipelineStatus;
  waiting_for_stage: PipelineStage | null;
  error_reason: string | null;
};
