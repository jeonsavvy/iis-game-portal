import type { AgentName, PipelineStage, PipelineStatus } from "@/types/pipeline";

export type AppRole = "master_admin";
export type GameStatus = "active" | "inactive" | "archived";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: AppRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          role?: AppRole;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "profiles_id_fkey"; columns: ["id"]; isOneToOne: true; referencedRelation: "users"; referencedColumns: ["id"] }];
      };
      admin_config: {
        Row: {
          id: string;
          requested_by: string | null;
          trigger_source: "telegram" | "console";
          keyword: string;
          payload: Record<string, unknown>;
          status: PipelineStatus;
          error_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requested_by?: string | null;
          trigger_source: "telegram" | "console";
          keyword: string;
          payload?: Record<string, unknown>;
          status?: PipelineStatus;
          error_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          requested_by?: string | null;
          trigger_source?: "telegram" | "console";
          keyword?: string;
          payload?: Record<string, unknown>;
          status?: PipelineStatus;
          error_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "admin_config_requested_by_fkey"; columns: ["requested_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      leaderboard: {
        Row: {
          id: number;
          game_id: string;
          player_name: string;
          score: number;
          player_fingerprint: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          game_id: string;
          player_name: string;
          score: number;
          player_fingerprint: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          game_id?: string;
          player_name?: string;
          score?: number;
          player_fingerprint?: string;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: "leaderboard_game_id_fkey"; columns: ["game_id"]; isOneToOne: false; referencedRelation: "games_metadata"; referencedColumns: ["id"] }];
      };
      pipeline_logs: {
        Row: {
          id: number;
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
        Insert: {
          id?: number;
          pipeline_id: string;
          stage: PipelineStage;
          status: PipelineStatus;
          agent_name: AgentName;
          message: string;
          reason?: string | null;
          attempt?: number;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: number;
          pipeline_id?: string;
          stage?: PipelineStage;
          status?: PipelineStatus;
          agent_name?: AgentName;
          message?: string;
          reason?: string | null;
          attempt?: number;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: "pipeline_logs_pipeline_id_fkey"; columns: ["pipeline_id"]; isOneToOne: false; referencedRelation: "admin_config"; referencedColumns: ["id"] }];
      };
      games_metadata: {
        Row: {
          id: string;
          slug: string;
          name: string;
          genre: string;
          url: string;
          thumbnail_url: string | null;
          ai_review: string | null;
          screenshot_url: string | null;
          status: GameStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          genre: string;
          url: string;
          thumbnail_url?: string | null;
          ai_review?: string | null;
          screenshot_url?: string | null;
          status?: GameStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          genre?: string;
          url?: string;
          thumbnail_url?: string | null;
          ai_review?: string | null;
          screenshot_url?: string | null;
          status?: GameStatus;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "games_metadata_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
    };
    Views: {
      users: {
        Row: {
          id: string;
          email: string;
          role: AppRole;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: AppRole;
      };
      is_master_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_reviewer_or_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      can_submit_score: {
        Args: {
          p_game_id: string;
          p_player_fingerprint: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: AppRole;
      pipeline_stage: PipelineStage;
      pipeline_status: PipelineStatus;
      pipeline_agent_name: AgentName;
      game_status: GameStatus;
    };
    CompositeTypes: Record<PropertyKey, never>;
  };
};
