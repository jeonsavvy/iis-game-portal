export type AppRole = "master_admin";
export type GameStatus = "active" | "inactive" | "archived";
export type SessionStatus = "active" | "published" | "cancelled" | "error";

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
      sessions: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          genre: string;
          status: SessionStatus;
          current_html: string;
          score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          genre?: string;
          status?: SessionStatus;
          current_html?: string;
          score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          genre?: string;
          status?: SessionStatus;
          current_html?: string;
          score?: number;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "sessions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      conversation_history: {
        Row: {
          id: string;
          session_id: string;
          role: string;
          content: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: string;
          content: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          role?: string;
          content?: string;
          metadata?: Record<string, unknown>;
        };
        Relationships: [{ foreignKeyName: "conversation_history_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "sessions"; referencedColumns: ["id"] }];
      };
      session_events: {
        Row: {
          id: string;
          session_id: string;
          event_type: string;
          agent: string | null;
          action: string | null;
          summary: string;
          score: number | null;
          before_score: number | null;
          after_score: number | null;
          decision_reason: string;
          input_signal: string;
          change_impact: string;
          confidence: number | null;
          error_code: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          event_type: string;
          agent?: string | null;
          action?: string | null;
          summary?: string;
          score?: number | null;
          before_score?: number | null;
          after_score?: number | null;
          decision_reason?: string;
          input_signal?: string;
          change_impact?: string;
          confidence?: number | null;
          error_code?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          summary?: string;
          score?: number | null;
          before_score?: number | null;
          after_score?: number | null;
          decision_reason?: string;
          input_signal?: string;
          change_impact?: string;
          confidence?: number | null;
          error_code?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [{ foreignKeyName: "session_events_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "sessions"; referencedColumns: ["id"] }];
      };
      session_publish_history: {
        Row: {
          id: string;
          session_id: string;
          game_id: string | null;
          game_slug: string;
          play_url: string;
          public_url: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          game_id?: string | null;
          game_slug: string;
          play_url: string;
          public_url?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          game_id?: string | null;
          game_slug?: string;
          play_url?: string;
          public_url?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [{ foreignKeyName: "session_publish_history_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "sessions"; referencedColumns: ["id"] }];
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
      game_status: GameStatus;
    };
    CompositeTypes: Record<PropertyKey, never>;
  };
};
