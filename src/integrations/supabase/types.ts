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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      groups: {
        Row: {
          allowed_meal_types: string[] | null
          auto_submit: boolean | null
          city: string
          code: string
          created_at: string
          cutoff_days: number | null
          id: string
          name: string
          no_repeats: boolean | null
          repeat_months: number | null
          res_time_end: string | null
          res_time_start: string | null
          search_radius: number | null
          updated_at: string
        }
        Insert: {
          allowed_meal_types?: string[] | null
          auto_submit?: boolean | null
          city: string
          code: string
          created_at?: string
          cutoff_days?: number | null
          id?: string
          name: string
          no_repeats?: boolean | null
          repeat_months?: number | null
          res_time_end?: string | null
          res_time_start?: string | null
          search_radius?: number | null
          updated_at?: string
        }
        Update: {
          allowed_meal_types?: string[] | null
          auto_submit?: boolean | null
          city?: string
          code?: string
          created_at?: string
          cutoff_days?: number | null
          id?: string
          name?: string
          no_repeats?: boolean | null
          repeat_months?: number | null
          res_time_end?: string | null
          res_time_start?: string | null
          search_radius?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      host_rotation_history: {
        Row: {
          created_at: string | null
          cycle_number: number
          group_id: string
          hosted_at: string | null
          id: string
          member_id: string
          reservation_id: string | null
        }
        Insert: {
          created_at?: string | null
          cycle_number?: number
          group_id: string
          hosted_at?: string | null
          id?: string
          member_id: string
          reservation_id?: string | null
        }
        Update: {
          created_at?: string | null
          cycle_number?: number
          group_id?: string
          hosted_at?: string | null
          id?: string
          member_id?: string
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "host_rotation_history_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_rotation_history_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_rotation_history_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_availability: {
        Row: {
          available_dates: string[]
          id: string
          member_id: string
          reservation_id: string
          submitted_at: string | null
        }
        Insert: {
          available_dates: string[]
          id?: string
          member_id: string
          reservation_id: string
          submitted_at?: string | null
        }
        Update: {
          available_dates?: string[]
          id?: string
          member_id?: string
          reservation_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_availability_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_availability_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          avatar_color: string | null
          created_at: string
          email: string | null
          email_enabled: boolean | null
          group_id: string
          host_count: number | null
          id: string
          is_host: boolean | null
          last_hosted_at: string | null
          name: string
          phone: string | null
          push_enabled: boolean | null
          sms_enabled: boolean | null
          user_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string
          email?: string | null
          email_enabled?: boolean | null
          group_id: string
          host_count?: number | null
          id?: string
          is_host?: boolean | null
          last_hosted_at?: string | null
          name: string
          phone?: string | null
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          user_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          created_at?: string
          email?: string | null
          email_enabled?: boolean | null
          group_id?: string
          host_count?: number | null
          id?: string
          is_host?: boolean | null
          last_hosted_at?: string | null
          name?: string
          phone?: string | null
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          delivered: boolean | null
          error: string | null
          id: string
          member_id: string
          reservation_id: string | null
          sent_at: string | null
          type: string
        }
        Insert: {
          channel: string
          delivered?: boolean | null
          error?: string | null
          id?: string
          member_id: string
          reservation_id?: string | null
          sent_at?: string | null
          type: string
        }
        Update: {
          channel?: string
          delivered?: boolean | null
          error?: string | null
          id?: string
          member_id?: string
          reservation_id?: string | null
          sent_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string | null
          created_at: string | null
          display_name: string | null
          id: string
          phone: string | null
          push_enabled: boolean | null
          sms_enabled: boolean | null
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          phone?: string | null
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
        }
        Update: {
          avatar_color?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          phone?: string | null
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
        }
        Relationships: []
      }
      reservation_attempts: {
        Row: {
          attempted_at: string | null
          id: string
          reservation_id: string
          restaurant_id: string
          skip_reason: string | null
          skipped: boolean | null
        }
        Insert: {
          attempted_at?: string | null
          id?: string
          reservation_id: string
          restaurant_id: string
          skip_reason?: string | null
          skipped?: boolean | null
        }
        Update: {
          attempted_at?: string | null
          id?: string
          reservation_id?: string
          restaurant_id?: string
          skip_reason?: string | null
          skipped?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_attempts_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_attempts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          attempt_count: number | null
          booking_url: string | null
          confirmed_at: string | null
          created_at: string
          dinner_date: string
          dinner_time: string | null
          group_id: string
          host_notified_at: string | null
          id: string
          next_host_id: string | null
          next_host_notified_at: string | null
          party_size: number
          restaurant_id: string | null
          reveal_at: string | null
          revealed_at: string | null
          skip_reason: string | null
          status: Database["public"]["Enums"]["reservation_status"] | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number | null
          booking_url?: string | null
          confirmed_at?: string | null
          created_at?: string
          dinner_date: string
          dinner_time?: string | null
          group_id: string
          host_notified_at?: string | null
          id?: string
          next_host_id?: string | null
          next_host_notified_at?: string | null
          party_size: number
          restaurant_id?: string | null
          reveal_at?: string | null
          revealed_at?: string | null
          skip_reason?: string | null
          status?: Database["public"]["Enums"]["reservation_status"] | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number | null
          booking_url?: string | null
          confirmed_at?: string | null
          created_at?: string
          dinner_date?: string
          dinner_time?: string | null
          group_id?: string
          host_notified_at?: string | null
          id?: string
          next_host_id?: string | null
          next_host_notified_at?: string | null
          party_size?: number
          restaurant_id?: string | null
          reveal_at?: string | null
          revealed_at?: string | null
          skip_reason?: string | null
          status?: Database["public"]["Enums"]["reservation_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_next_host_id_fkey"
            columns: ["next_host_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          city: string
          created_at: string
          cuisine: string | null
          google_place_id: string | null
          google_rating: number | null
          google_review_count: number | null
          group_id: string
          id: string
          name: string
          price: number | null
          requires_card: boolean | null
          sc_rating: number | null
          sc_review_count: number | null
          suggested_by: string | null
          visited: boolean | null
          visited_date: string | null
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          cuisine?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          group_id: string
          id?: string
          name: string
          price?: number | null
          requires_card?: boolean | null
          sc_rating?: number | null
          sc_review_count?: number | null
          suggested_by?: string | null
          visited?: boolean | null
          visited_date?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          cuisine?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          group_id?: string
          id?: string
          name?: string
          price?: number | null
          requires_card?: boolean | null
          sc_rating?: number | null
          sc_review_count?: number | null
          suggested_by?: string | null
          visited?: boolean | null
          visited_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          best_dish_member: string | null
          city: string | null
          created_at: string
          cuisine: string | null
          group_id: string | null
          id: string
          meal_type: string | null
          member_id: string | null
          photo_url: string | null
          rating: number
          reservation_id: string | null
          restaurant_id: string | null
          restaurant_name: string
          return_choice: string | null
          review_text: string | null
          user_id: string
        }
        Insert: {
          best_dish_member?: string | null
          city?: string | null
          created_at?: string
          cuisine?: string | null
          group_id?: string | null
          id?: string
          meal_type?: string | null
          member_id?: string | null
          photo_url?: string | null
          rating: number
          reservation_id?: string | null
          restaurant_id?: string | null
          restaurant_name: string
          return_choice?: string | null
          review_text?: string | null
          user_id: string
        }
        Update: {
          best_dish_member?: string | null
          city?: string | null
          created_at?: string
          cuisine?: string | null
          group_id?: string | null
          id?: string
          meal_type?: string | null
          member_id?: string | null
          photo_url?: string | null
          rating?: number
          reservation_id?: string | null
          restaurant_id?: string | null
          restaurant_name?: string
          return_choice?: string | null
          review_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_key: string
          badge_type: string
          earned_at: string
          group_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_key: string
          badge_type?: string
          earned_at?: string
          group_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          badge_type?: string
          earned_at?: string
          group_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      reservation_status:
        | "pending_selection"
        | "pending_host_booking"
        | "card_required_skipped"
        | "confirmed"
        | "revealed"
        | "completed"
        | "cancelled"
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
      reservation_status: [
        "pending_selection",
        "pending_host_booking",
        "card_required_skipped",
        "confirmed",
        "revealed",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
