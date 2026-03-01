export type AgentName =
  | "analyzer"
  | "planner"
  | "designer"
  | "developer"
  | "qa_runtime"
  | "qa_quality"
  | "releaser"
  | "reporter";

export type PipelineStage =
  | "analyze"
  | "plan"
  | "design"
  | "build"
  | "qa_runtime"
  | "qa_quality"
  | "release"
  | "report"
  | "done";

export type PipelineStatus = "queued" | "running" | "success" | "error" | "retry" | "skipped";
export type PipelineControlAction = "pause" | "resume" | "cancel" | "retry";

export type PipelineLogMetadata = {
  deliverables?: string[];
  contract_status?: "pass" | "warn" | "fail" | string;
  contract_summary?: string;
  contribution_score?: number;
  stage_contribution_summary?: Record<string, unknown>;
  fatal_errors?: string[];
  non_fatal_warnings?: string[];
  [key: string]: unknown;
};

export type PipelineLog = {
  id?: number;
  pipeline_id: string;
  stage: PipelineStage;
  status: PipelineStatus;
  agent_name: AgentName;
  message: string;
  reason: string | null;
  attempt: number;
  metadata: PipelineLogMetadata;
  created_at: string;
};

export type PipelineSummary = {
  pipeline_id: string;
  keyword: string;
  source: "telegram" | "console";
  status: PipelineStatus;
  execution_mode: "auto";
  pipeline_version: string;
  error_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type PipelineControlResponse = {
  pipeline_id: string;
  action: PipelineControlAction;
  execution_mode: "auto";
  status: PipelineStatus;
  error_reason: string | null;
};
