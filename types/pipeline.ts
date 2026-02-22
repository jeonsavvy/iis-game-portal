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
