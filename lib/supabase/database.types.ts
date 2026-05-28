export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      anonymous_attempts: {
        Row: {
          completed_at: string | null
          cost_usd: number
          created_at: string
          expires_at: string
          fingerprint_hash: string
          id: string
          ip_hash: string
          output_image_url: string | null
          status: Database["public"]["Enums"]["generation_status"]
          trend_id: string
        }
        Insert: {
          completed_at?: string | null
          cost_usd?: number
          created_at?: string
          expires_at?: string
          fingerprint_hash: string
          id?: string
          ip_hash: string
          output_image_url?: string | null
          status?: Database["public"]["Enums"]["generation_status"]
          trend_id: string
        }
        Update: {
          completed_at?: string | null
          cost_usd?: number
          created_at?: string
          expires_at?: string
          fingerprint_hash?: string
          id?: string
          ip_hash?: string
          output_image_url?: string | null
          status?: Database["public"]["Enums"]["generation_status"]
          trend_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_attempts_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          attempts: number
          completed_at: string | null
          cost_usd: number
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          input_payload: Json
          is_public: boolean
          model_used: string | null
          output_image_url: string | null
          purge_at: string | null
          share_count: number
          status: Database["public"]["Enums"]["generation_status"]
          trend_id: string
          trend_version: number
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          cost_usd?: number
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          input_payload: Json
          is_public?: boolean
          model_used?: string | null
          output_image_url?: string | null
          purge_at?: string | null
          share_count?: number
          status?: Database["public"]["Enums"]["generation_status"]
          trend_id: string
          trend_version: number
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          cost_usd?: number
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          input_payload?: Json
          is_public?: boolean
          model_used?: string | null
          output_image_url?: string | null
          purge_at?: string | null
          share_count?: number
          status?: Database["public"]["Enums"]["generation_status"]
          trend_id?: string
          trend_version?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bonus_credits_earned: number
          created_at: string
          credits_balance: number
          deleted_at: string | null
          email: string
          free_used_this_week: number
          free_week_starts_at: string
          id: string
          name: string | null
          push_subscription: Json | null
          referral_code: string
          referred_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          bonus_credits_earned?: number
          created_at?: string
          credits_balance?: number
          deleted_at?: string | null
          email: string
          free_used_this_week?: number
          free_week_starts_at?: string
          id: string
          name?: string | null
          push_subscription?: Json | null
          referral_code?: string
          referred_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          bonus_credits_earned?: number
          created_at?: string
          credits_balance?: number
          deleted_at?: string | null
          email?: string
          free_used_this_week?: number
          free_week_starts_at?: string
          id?: string
          name?: string | null
          push_subscription?: Json | null
          referral_code?: string
          referred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          rewarded_at: string | null
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_eval_inputs: {
        Row: {
          created_at: string
          demographic_tag: string | null
          id: string
          image_url: string
          label: string
          trend_id: string
        }
        Insert: {
          created_at?: string
          demographic_tag?: string | null
          id?: string
          image_url: string
          label: string
          trend_id: string
        }
        Update: {
          created_at?: string
          demographic_tag?: string | null
          id?: string
          image_url?: string
          label?: string
          trend_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_eval_inputs_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_eval_runs: {
        Row: {
          admin_rating: string | null
          created_at: string
          eval_input_id: string
          id: string
          output_url: string | null
          prompt_version: number
          rated_by: string | null
          trend_id: string
        }
        Insert: {
          admin_rating?: string | null
          created_at?: string
          eval_input_id: string
          id?: string
          output_url?: string | null
          prompt_version: number
          rated_by?: string | null
          trend_id: string
        }
        Update: {
          admin_rating?: string | null
          created_at?: string
          eval_input_id?: string
          id?: string
          output_url?: string | null
          prompt_version?: number
          rated_by?: string | null
          trend_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_eval_runs_eval_input_id_fkey"
            columns: ["eval_input_id"]
            isOneToOne: false
            referencedRelation: "trend_eval_inputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trend_eval_runs_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_suggestions: {
        Row: {
          created_at: string
          id: string
          payload: Json
          reviewed_at: string | null
          reviewed_by: string | null
          source: Database["public"]["Enums"]["suggestion_source"]
          status: Database["public"]["Enums"]["suggestion_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: Database["public"]["Enums"]["suggestion_source"]
          status?: Database["public"]["Enums"]["suggestion_status"]
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Database["public"]["Enums"]["suggestion_source"]
          status?: Database["public"]["Enums"]["suggestion_status"]
        }
        Relationships: []
      }
      trends: {
        Row: {
          aspect_ratio: Database["public"]["Enums"]["trend_aspect_ratio"]
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          eval_status: Database["public"]["Enums"]["eval_status"]
          expires_at: string | null
          faq: Json
          id: string
          input_schema: Json
          is_active: boolean
          model: Database["public"]["Enums"]["trend_model"]
          prompt_template: string
          prompt_template_history: Json
          reference_image_urls: string[]
          sample_after_url: string | null
          sample_before_url: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          aspect_ratio?: Database["public"]["Enums"]["trend_aspect_ratio"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          eval_status?: Database["public"]["Enums"]["eval_status"]
          expires_at?: string | null
          faq?: Json
          id?: string
          input_schema?: Json
          is_active?: boolean
          model?: Database["public"]["Enums"]["trend_model"]
          prompt_template: string
          prompt_template_history?: Json
          reference_image_urls?: string[]
          sample_after_url?: string | null
          sample_before_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          aspect_ratio?: Database["public"]["Enums"]["trend_aspect_ratio"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          eval_status?: Database["public"]["Enums"]["eval_status"]
          expires_at?: string | null
          faq?: Json
          id?: string
          input_schema?: Json
          is_active?: boolean
          model?: Database["public"]["Enums"]["trend_model"]
          prompt_template?: string
          prompt_template_history?: Json
          reference_image_urls?: string[]
          sample_after_url?: string | null
          sample_before_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payload: Json
          processed_at: string | null
          source: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payload: Json
          processed_at?: string | null
          source: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      grant_credits: {
        Args: {
          p_amount: number
          p_source: string
          p_source_ref: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      admin_role: "admin" | "editor"
      eval_status: "untested" | "passed" | "failed"
      generation_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "failed_retryable"
      referral_status: "pending" | "rewarded"
      suggestion_source: "auto" | "user"
      suggestion_status: "pending" | "approved" | "rejected"
      trend_aspect_ratio: "1:1" | "3:4" | "16:9" | "9:16"
      trend_model: "nano-banana" | "nano-banana-pro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      admin_role: ["admin", "editor"],
      eval_status: ["untested", "passed", "failed"],
      generation_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "failed_retryable",
      ],
      referral_status: ["pending", "rewarded"],
      suggestion_source: ["auto", "user"],
      suggestion_status: ["pending", "approved", "rejected"],
      trend_aspect_ratio: ["1:1", "3:4", "16:9", "9:16"],
      trend_model: ["nano-banana", "nano-banana-pro"],
    },
  },
} as const
