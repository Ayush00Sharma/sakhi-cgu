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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      alert_deliveries: {
        Row: {
          alert_id: string | null
          channel: string
          contact_id: string | null
          contact_name: string | null
          created_at: string
          error: string | null
          id: string
          phone: string
          provider_message_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          channel?: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          error?: string | null
          id?: string
          phone: string
          provider_message_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          channel?: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          error?: string | null
          id?: string
          phone?: string
          provider_message_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_deliveries_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "safety_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_deliveries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "trusted_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_sessions: {
        Row: {
          created_at: string
          escalated_at: string | null
          grace_minutes: number
          id: string
          interval_minutes: number
          is_active: boolean
          last_checkin_at: string | null
          next_due_at: string
          share_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          escalated_at?: string | null
          grace_minutes?: number
          id?: string
          interval_minutes?: number
          is_active?: boolean
          last_checkin_at?: string | null
          next_due_at?: string
          share_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          escalated_at?: string | null
          grace_minutes?: number
          id?: string
          interval_minutes?: number
          is_active?: boolean
          last_checkin_at?: string | null
          next_due_at?: string
          share_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_sessions_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "location_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          accuracy: number | null
          category: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          occurred_at: string
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          category: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          occurred_at?: string
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          category?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          occurred_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      location_history: {
        Row: {
          accuracy: number | null
          created_at: string
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      location_shares: {
        Row: {
          accuracy: number | null
          alert_active: boolean
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          label: string | null
          last_ping_at: string | null
          latitude: number | null
          longitude: number | null
          owner_name: string | null
          owner_phone: string | null
          reason: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          alert_active?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_ping_at?: string | null
          latitude?: number | null
          longitude?: number | null
          owner_name?: string | null
          owner_phone?: string | null
          reason?: string
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          alert_active?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_ping_at?: string | null
          latitude?: number | null
          longitude?: number | null
          owner_name?: string | null
          owner_phone?: string | null
          reason?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          onboarding_completed_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          onboarding_completed_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      safety_alerts: {
        Row: {
          alert_type: string
          created_at: string
          has_recording: boolean
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          message: string | null
          recording_path: string | null
          share_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          has_recording?: boolean
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          recording_path?: string | null
          share_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          has_recording?: boolean
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          recording_path?: string | null
          share_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_alerts_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "location_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_settings: {
        Row: {
          alert_sound: boolean
          auto_record: boolean
          auto_share_location: boolean
          confirm_share_on_sos: boolean
          created_at: string
          fake_call_delay_seconds: number
          fake_caller_name: string
          fake_caller_photo_url: string | null
          silent_mode: boolean
          track_history: boolean
          tracking_paused_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_sound?: boolean
          auto_record?: boolean
          auto_share_location?: boolean
          confirm_share_on_sos?: boolean
          created_at?: string
          fake_call_delay_seconds?: number
          fake_caller_name?: string
          fake_caller_photo_url?: string | null
          silent_mode?: boolean
          track_history?: boolean
          tracking_paused_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_sound?: boolean
          auto_record?: boolean
          auto_share_location?: boolean
          confirm_share_on_sos?: boolean
          created_at?: string
          fake_call_delay_seconds?: number
          fake_caller_name?: string
          fake_caller_photo_url?: string | null
          silent_mode?: boolean
          track_history?: boolean
          tracking_paused_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trusted_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          priority: number
          relationship: string | null
          updated_at: string
          user_id: string
          verification_sent_at: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          priority?: number
          relationship?: string | null
          updated_at?: string
          user_id: string
          verification_sent_at?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          priority?: number
          relationship?: string | null
          updated_at?: string
          user_id?: string
          verification_sent_at?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      purge_old_location_history: { Args: never; Returns: undefined }
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
    Enums: {},
  },
} as const
