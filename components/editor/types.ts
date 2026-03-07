export type ChatAttachment = {
  name: string;
  mime_type: string;
  data_url?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "visual_qa" | "playtester" | "system";
  content: string;
  timestamp: number;
  attachment?: ChatAttachment | null;
};

export type ChatSendPayload = {
  prompt: string;
  attachment?: ChatAttachment | null;
  mode?: "auto" | "generate" | "issue";
};

export type ChatAction = {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "primary";
};

export type AgentActivity = {
  agent: string;
  action: string;
  summary: string;
  score: number;
  decision_reason?: string;
  input_signal?: string;
  change_impact?: string;
  confidence?: number;
  error_code?: string | null;
  before_score?: number | null;
  after_score?: number | null;
  metadata?: Record<string, unknown>;
};

export type RunStatus = "idle" | "queued" | "retrying" | "running" | "succeeded" | "failed" | "cancelled";
