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

export type QualityGateDetail = {
  ok?: boolean;
  score?: number;
  threshold?: number;
  failed_checks?: string[];
};

export type PlayabilityGateDetail = {
  ok?: boolean;
  score?: number;
  fail_reasons?: string[];
};

export type SmokeGateDetail = {
  ok?: boolean;
  reason?: string | null;
  fatal_errors?: string[] | null;
  non_fatal_warnings?: string[] | null;
};

export type QualityGateReport = {
  quality?: QualityGateDetail;
  gameplay?: QualityGateDetail;
  visual?: QualityGateDetail;
  playability?: PlayabilityGateDetail;
  smoke?: SmokeGateDetail;
};

export type IntentContract = {
  fantasy?: string;
  player_verbs?: string[];
  camera_interaction?: string;
  progression_loop?: string[];
  fail_restart_loop?: string;
  non_negotiables?: string[];
};

export type IntentGateReport = {
  ok?: boolean;
  score?: number;
  threshold?: number;
  failed_items?: string[];
  checks?: Record<string, boolean>;
  reason_by_item?: Record<string, string[]>;
};

export type SynapseContract = {
  schema_version?: string;
  runtime_contract?: {
    engine_mode?: "2d_phaser" | "3d_three" | string;
    single_artifact_html?: boolean;
    preserve_boot_flags?: boolean;
  };
  quality_bar?: {
    quality_min?: number;
    gameplay_min?: number;
    visual_min?: number;
  };
  required_mechanics?: string[];
  required_progression?: string[];
  required_visual_signals?: string[];
  required_assets?: string[];
  non_negotiables?: string[];
};

export type PipelineLogMetadata = {
  generation_engine_version?: string;
  upstream_reason?: string;
  vertex_error?: string;
  quality_gate_report?: QualityGateReport;
  intent_contract?: IntentContract;
  intent_contract_hash?: string;
  synapse_contract?: SynapseContract;
  synapse_contract_hash?: string;
  intent_gate_report?: IntentGateReport;
  strict_vertex_only?: boolean;
  fallback_blocked?: boolean;
  codegen_generation_attempts?: number;
  blocking_reasons?: string[];
  quality_floor_passed?: boolean;
  quality_floor_enforced?: boolean;
  quality_floor_fail_reasons?: string[];
  quality_floor_score?: number;
  final_quality_score?: number;
  final_gameplay_score?: number;
  final_visual_score?: number;
  final_builder_quality_score?: number;
  final_smoke_ok?: boolean;
  final_smoke_reason?: string | null;
  deliverables?: string[];
  contract_status?: "pass" | "warn" | "fail" | string;
  contract_summary?: string;
  contribution_score?: number;
  playability_score?: number;
  playability_fail_reasons?: string[];
  substrate_id?: string;
  camera_model?: string;
  stage_contribution_summary?: Record<string, unknown>;
  fatal_errors?: string[];
  non_fatal_warnings?: string[];
  capability_profile?: Record<string, unknown>;
  module_plan?: Record<string, unknown>;
  selfcheck_result?: {
    passed?: boolean;
    score?: number;
    failed_reasons?: string[];
    checks?: Record<string, boolean>;
    [key: string]: unknown;
  };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    estimated_cost_usd?: number;
  };
  rqc_passed?: boolean;
  rebuild_source?: string;
  module_signature?: string;
  rqc_version?: string;
  event_type?: "contract_compile" | "module_assemble" | "selfcheck" | "publish" | string;
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
