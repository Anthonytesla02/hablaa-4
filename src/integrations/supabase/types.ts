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
      completed_days: {
        Row: {
          completed_at: string
          day_key: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          day_key: string
          user_id: string
        }
        Update: {
          completed_at?: string
          day_key?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_posts: {
        Row: {
          body: string
          callsign: string
          created_at: string
          id: string
          kind: string
          stats: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          callsign?: string
          created_at?: string
          id?: string
          kind?: string
          stats?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          callsign?: string
          created_at?: string
          id?: string
          kind?: string
          stats?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          badges: string[]
          callsign: string
          created_at: string
          credits: number
          freezes: number
          ghost_seed: number
          lang_id: string
          last_active_day: string | null
          last_login_day: string | null
          league_tier: number
          longest_streak: number
          perfect_week: boolean
          persona_id: string
          quests: Json
          settings: Json
          shadow_reps: number
          started_at: number
          streak: number
          sts_streak: number
          tier_id: string
          timeline_id: string
          updated_at: string
          user_id: string
          weekly_xp: number
          xp: number
        }
        Insert: {
          badges?: string[]
          callsign?: string
          created_at?: string
          credits?: number
          freezes?: number
          ghost_seed?: number
          lang_id?: string
          last_active_day?: string | null
          last_login_day?: string | null
          league_tier?: number
          longest_streak?: number
          perfect_week?: boolean
          persona_id?: string
          quests?: Json
          settings?: Json
          shadow_reps?: number
          started_at?: number
          streak?: number
          sts_streak?: number
          tier_id?: string
          timeline_id?: string
          updated_at?: string
          user_id: string
          weekly_xp?: number
          xp?: number
        }
        Update: {
          badges?: string[]
          callsign?: string
          created_at?: string
          credits?: number
          freezes?: number
          ghost_seed?: number
          lang_id?: string
          last_active_day?: string | null
          last_login_day?: string | null
          league_tier?: number
          longest_streak?: number
          perfect_week?: boolean
          persona_id?: string
          quests?: Json
          settings?: Json
          shadow_reps?: number
          started_at?: number
          streak?: number
          sts_streak?: number
          tier_id?: string
          timeline_id?: string
          updated_at?: string
          user_id?: string
          weekly_xp?: number
          xp?: number
        }
        Relationships: []
      }
      session_history: {
        Row: {
          accuracy: number
          cover_intact: boolean
          created_at: string
          date: number
          day_key: string
          id: string
          items: number
          user_id: string
          xp: number
        }
        Insert: {
          accuracy?: number
          cover_intact?: boolean
          created_at?: string
          date: number
          day_key: string
          id?: string
          items?: number
          user_id: string
          xp?: number
        }
        Update: {
          accuracy?: number
          cover_intact?: boolean
          created_at?: string
          date?: number
          day_key?: string
          id?: string
          items?: number
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      srs_cards: {
        Row: {
          created_at: string
          due_at: number
          ease: number
          id: string
          interval_days: number
          lang: string
          lapses: number
          reps: number
          target: string
          translation: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_at: number
          ease?: number
          id: string
          interval_days?: number
          lang: string
          lapses?: number
          reps?: number
          target: string
          translation: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_at?: number
          ease?: number
          id?: string
          interval_days?: number
          lang?: string
          lapses?: number
          reps?: number
          target?: string
          translation?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
