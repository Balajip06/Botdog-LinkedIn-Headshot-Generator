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
      admin_marketing_spend: {
        Row: {
          channel: string
          created_at: string
          id: string
          notes: string | null
          recorded_by: string | null
          usd_spent: number
          week_start: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          usd_spent: number
          week_start: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          usd_spent?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_marketing_spend_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          cost_usd: number
          created_at: string
          expires_at: string
          fingerprint_hash: string
          id: string
          input_payload: Json | null
          ip_hash: string
          output_image_url: string | null
          status: Database["public"]["Enums"]["generation_status"]
          trend_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          cost_usd?: number
          created_at?: string
          expires_at?: string
          fingerprint_hash: string
          id?: string
          input_payload?: Json | null
          ip_hash: string
          output_image_url?: string | null
          status?: Database["public"]["Enums"]["generation_status"]
          trend_id: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          cost_usd?: number
          created_at?: string
          expires_at?: string
          fingerprint_hash?: string
          id?: string
          input_payload?: Json | null
          ip_hash?: string
          output_image_url?: string | null
          status?: Database["public"]["Enums"]["generation_status"]
          trend_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_attempts_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anonymous_attempts_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          active_model: Database["public"]["Enums"]["image_model"]
          id: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active_model?: Database["public"]["Enums"]["image_model"]
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active_model?: Database["public"]["Enums"]["image_model"]
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_leads: {
        Row: {
          attempt_id: string | null
          converted_at: string | null
          converted_user_id: string | null
          created_at: string
          email: string
          email_hash: string | null
          id: string
          next_path: string | null
          source: string
        }
        Insert: {
          attempt_id?: string | null
          converted_at?: string | null
          converted_user_id?: string | null
          created_at?: string
          email: string
          email_hash?: string | null
          id?: string
          next_path?: string | null
          source?: string
        }
        Update: {
          attempt_id?: string | null
          converted_at?: string | null
          converted_user_id?: string | null
          created_at?: string
          email?: string
          email_hash?: string | null
          id?: string
          next_path?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_leads_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "anonymous_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_leads_converted_user_id_fkey"
            columns: ["converted_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          attempts: number
          claimed_from_anon: string | null
          completed_at: string | null
          cost_usd: number
          created_at: string
          error_message: string | null
          favorited_at: string | null
          id: string
          idempotency_key: string
          input_payload: Json
          is_favorite: boolean
          is_public: boolean
          model_used: string | null
          output_image_url: string | null
          processing_at: string | null
          purge_at: string | null
          share_count: number
          status: Database["public"]["Enums"]["generation_status"]
          tier_at_generation: Database["public"]["Enums"]["generation_tier"]
          trend_id: string
          trend_version: number
          user_id: string
        }
        Insert: {
          attempts?: number
          claimed_from_anon?: string | null
          completed_at?: string | null
          cost_usd?: number
          created_at?: string
          error_message?: string | null
          favorited_at?: string | null
          id?: string
          idempotency_key: string
          input_payload: Json
          is_favorite?: boolean
          is_public?: boolean
          model_used?: string | null
          output_image_url?: string | null
          processing_at?: string | null
          purge_at?: string | null
          share_count?: number
          status?: Database["public"]["Enums"]["generation_status"]
          // NOTE: hand-tweaked from the generated `tier_at_generation: …`
          // (required) to optional. The column is NOT NULL with no DB default,
          // but the BEFORE-INSERT trigger `consume_quota_on_generation_insert`
          // always sets it, so clients legitimately omit it on insert. Re-apply
          // this `?` after any `pnpm supabase:types` regen.
          tier_at_generation?: Database["public"]["Enums"]["generation_tier"]
          trend_id: string
          trend_version: number
          user_id: string
        }
        Update: {
          attempts?: number
          claimed_from_anon?: string | null
          completed_at?: string | null
          cost_usd?: number
          created_at?: string
          error_message?: string | null
          favorited_at?: string | null
          id?: string
          idempotency_key?: string
          input_payload?: Json
          is_favorite?: boolean
          is_public?: boolean
          model_used?: string | null
          output_image_url?: string | null
          processing_at?: string | null
          purge_at?: string | null
          share_count?: number
          status?: Database["public"]["Enums"]["generation_status"]
          tier_at_generation?: Database["public"]["Enums"]["generation_tier"]
          trend_id?: string
          trend_version?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_claimed_from_anon_fkey"
            columns: ["claimed_from_anon"]
            isOneToOne: false
            referencedRelation: "anonymous_attempts"
            referencedColumns: ["id"]
          },
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
          acquisition_source: Json | null
          avatar_url: string | null
          bonus_credits_earned: number
          created_at: string
          credits_balance: number
          deleted_at: string | null
          email: string
          favourite_trend_ids: string[]
          first_purchase_discount_used_at: string | null
          free_used_this_week: number
          free_week_starts_at: string
          id: string
          is_vip: boolean
          name: string | null
          push_subscription: Json | null
          referral_code: string
          referred_by: string | null
          stripe_customer_id: string | null
          sub_allowance: number
          sub_used_this_period: number
          subscription_id: string | null
          subscription_period_end: string | null
          subscription_status: string | null
          tos_accepted_at: string | null
          vip_granted_at: string | null
          vip_granted_by: string | null
          vip_reason: string | null
        }
        Insert: {
          acquisition_source?: Json | null
          avatar_url?: string | null
          bonus_credits_earned?: number
          created_at?: string
          credits_balance?: number
          deleted_at?: string | null
          email: string
          favourite_trend_ids?: string[]
          first_purchase_discount_used_at?: string | null
          free_used_this_week?: number
          free_week_starts_at?: string
          id: string
          is_vip?: boolean
          name?: string | null
          push_subscription?: Json | null
          referral_code?: string
          referred_by?: string | null
          stripe_customer_id?: string | null
          sub_allowance?: number
          sub_used_this_period?: number
          subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_status?: string | null
          tos_accepted_at?: string | null
          vip_granted_at?: string | null
          vip_granted_by?: string | null
          vip_reason?: string | null
        }
        Update: {
          acquisition_source?: Json | null
          avatar_url?: string | null
          bonus_credits_earned?: number
          created_at?: string
          credits_balance?: number
          deleted_at?: string | null
          email?: string
          favourite_trend_ids?: string[]
          first_purchase_discount_used_at?: string | null
          free_used_this_week?: number
          free_week_starts_at?: string
          id?: string
          is_vip?: boolean
          name?: string | null
          push_subscription?: Json | null
          referral_code?: string
          referred_by?: string | null
          stripe_customer_id?: string | null
          sub_allowance?: number
          sub_used_this_period?: number
          subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_status?: string | null
          tos_accepted_at?: string | null
          vip_granted_at?: string | null
          vip_granted_by?: string | null
          vip_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_vip_granted_by_fkey"
            columns: ["vip_granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          id: string
          referee_email_hash: string
          referrer_id: string | null
          rewarded_at: string
          source_referral_id: string | null
        }
        Insert: {
          id?: string
          referee_email_hash: string
          referrer_id?: string | null
          rewarded_at?: string
          source_referral_id?: string | null
        }
        Update: {
          id?: string
          referee_email_hash?: string
          referrer_id?: string | null
          rewarded_at?: string
          source_referral_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_source_referral_id_fkey"
            columns: ["source_referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
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
      trend_events: {
        Row: {
          id: number
          occurred_at: string
          trend_slug: string
          type: string
        }
        Insert: {
          id?: number
          occurred_at?: string
          trend_slug: string
          type: string
        }
        Update: {
          id?: number
          occurred_at?: string
          trend_slug?: string
          type?: string
        }
        Relationships: []
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
          activated_at: string | null
          aspect_ratio: Database["public"]["Enums"]["trend_aspect_ratio"]
          auto_deactivate_disabled: boolean
          auto_deactivate_threshold: number
          cloned_from: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          eval_status: Database["public"]["Enums"]["eval_status"]
          expires_at: string | null
          faq: Json
          goes_live_at: string | null
          id: string
          input_schema: Json
          is_active: boolean
          is_featured: boolean
          model: Database["public"]["Enums"]["trend_model"]
          prompt_template: string
          prompt_template_history: Json
          reference_image_urls: string[]
          sample_after_url: string | null
          sample_before_url: string | null
          seo_description: string | null
          seo_title: string | null
          share_caption_template: string | null
          slug: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          activated_at?: string | null
          aspect_ratio?: Database["public"]["Enums"]["trend_aspect_ratio"]
          auto_deactivate_disabled?: boolean
          auto_deactivate_threshold?: number
          cloned_from?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          eval_status?: Database["public"]["Enums"]["eval_status"]
          expires_at?: string | null
          faq?: Json
          goes_live_at?: string | null
          id?: string
          input_schema?: Json
          is_active?: boolean
          is_featured?: boolean
          model?: Database["public"]["Enums"]["trend_model"]
          prompt_template: string
          prompt_template_history?: Json
          reference_image_urls?: string[]
          sample_after_url?: string | null
          sample_before_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          share_caption_template?: string | null
          slug: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          activated_at?: string | null
          aspect_ratio?: Database["public"]["Enums"]["trend_aspect_ratio"]
          auto_deactivate_disabled?: boolean
          auto_deactivate_threshold?: number
          cloned_from?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          eval_status?: Database["public"]["Enums"]["eval_status"]
          expires_at?: string | null
          faq?: Json
          goes_live_at?: string | null
          id?: string
          input_schema?: Json
          is_active?: boolean
          is_featured?: boolean
          model?: Database["public"]["Enums"]["trend_model"]
          prompt_template?: string
          prompt_template_history?: Json
          reference_image_urls?: string[]
          sample_after_url?: string | null
          sample_before_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          share_caption_template?: string | null
          slug?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "trends_cloned_from_fkey"
            columns: ["cloned_from"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
        ]
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
      auto_deactivate_cold_trends: { Args: never; Returns: undefined }
      claim_anonymous_attempt: {
        Args: { p_attempt_id: string; p_user_id: string }
        Returns: string
      }
      email_to_hash: { Args: { p_email: string }; Returns: string }
      grant_credits: {
        Args: {
          p_amount: number
          p_source: string
          p_source_ref: string
          p_user_id: string
        }
        Returns: undefined
      }
      purge_expired_anonymous: { Args: never; Returns: undefined }
      purge_expired_generations: { Args: never; Returns: undefined }
      purge_soft_deleted_profiles: { Args: never; Returns: undefined }
      reap_stuck_processing: { Args: never; Returns: undefined }
      reset_free_weekly: { Args: never; Returns: undefined }
      set_subscription_state: {
        Args: {
          p_customer_id: string
          p_period_end: string
          p_reset_usage: boolean
          p_status: string
          p_subscription_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      trend_discovery_heartbeat: { Args: never; Returns: undefined }
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
      generation_tier: "free" | "credit" | "vip" | "subscription"
      image_model: "nano-banana" | "nano-banana-pro" | "gpt-image-2"
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
      generation_tier: ["free", "credit", "vip", "subscription"],
      image_model: ["nano-banana", "nano-banana-pro", "gpt-image-2"],
      referral_status: ["pending", "rewarded"],
      suggestion_source: ["auto", "user"],
      suggestion_status: ["pending", "approved", "rejected"],
      trend_aspect_ratio: ["1:1", "3:4", "16:9", "9:16"],
      trend_model: ["nano-banana", "nano-banana-pro"],
    },
  },
} as const
