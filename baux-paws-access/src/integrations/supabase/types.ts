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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      booking: {
        Row: {
          booking_date: string
          booking_time: string | null
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          end_date: string | null
          event_id: string | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          number_of_dogs: number | null
          number_of_humans: number | null
          product_description: string | null
          product_name: string
          product_type: Database["public"]["Enums"]["product_type"]
          provider_id: string
          shopify_order_id: string | null
          special_requests: string | null
          status: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          booking_date: string
          booking_time?: string | null
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          end_date?: string | null
          event_id?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          number_of_dogs?: number | null
          number_of_humans?: number | null
          product_description?: string | null
          product_name: string
          product_type?: Database["public"]["Enums"]["product_type"]
          provider_id: string
          shopify_order_id?: string | null
          special_requests?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          booking_date?: string
          booking_time?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          end_date?: string | null
          event_id?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          number_of_dogs?: number | null
          number_of_humans?: number | null
          product_description?: string | null
          product_name?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          provider_id?: string
          shopify_order_id?: string | null
          special_requests?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      class: {
        Row: {
          created_at: string | null
          description: string | null
          duration_hours: number
          id: string
          images: string[] | null
          max_participants: number
          meeting_point: string | null
          name: string
          predefined_prices: Json | null
          price_adult_base: number | null
          price_dog_base: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"] | null
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_hours?: number
          id?: string
          images?: string[] | null
          max_participants?: number
          meeting_point?: string | null
          name: string
          predefined_prices?: Json | null
          price_adult_base?: number | null
          price_dog_base?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"] | null
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_hours?: number
          id?: string
          images?: string[] | null
          max_participants?: number
          meeting_point?: string | null
          name?: string
          predefined_prices?: Json | null
          price_adult_base?: number | null
          price_dog_base?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"] | null
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      experience: {
        Row: {
          created_at: string | null
          description: string | null
          duration_hours: number
          id: string
          images: string[] | null
          max_participants: number
          meeting_point: string | null
          name: string
          predefined_prices: Json | null
          price_adult_base: number | null
          price_dog_base: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"] | null
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_hours: number
          id?: string
          images?: string[] | null
          max_participants?: number
          meeting_point?: string | null
          name: string
          predefined_prices?: Json | null
          price_adult_base?: number | null
          price_dog_base?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"] | null
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_hours?: number
          id?: string
          images?: string[] | null
          max_participants?: number
          meeting_point?: string | null
          name?: string
          predefined_prices?: Json | null
          price_adult_base?: number | null
          price_dog_base?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"] | null
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          active: boolean
          company_name: string
          contact_name: string
          created_at: string | null
          email: string
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          company_name: string
          contact_name: string
          created_at?: string | null
          email: string
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          company_name?: string
          contact_name?: string
          created_at?: string | null
          email?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      signup_code: {
        Row: {
          code: string
          created_at: string | null
          id: string
          used: boolean | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      trip: {
        Row: {
          booking_qty: number | null
          created_at: string | null
          description: string | null
          duration_days: number
          end_date: string | null
          id: string
          images: string[] | null
          location: string | null
          max_participants: number
          name: string
          predefined_prices: Json | null
          price_adult_base: number | null
          price_dog_base: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"] | null
          provider_id: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          booking_qty?: number | null
          created_at?: string | null
          description?: string | null
          duration_days: number
          end_date?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          max_participants?: number
          name: string
          predefined_prices?: Json | null
          price_adult_base?: number | null
          price_dog_base?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"] | null
          provider_id: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_qty?: number | null
          created_at?: string | null
          description?: string | null
          duration_days?: number
          end_date?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          max_participants?: number
          name?: string
          predefined_prices?: Json | null
          price_adult_base?: number | null
          price_dog_base?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"] | null
          provider_id?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_role: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_signup_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_booking_status_change: {
        Args: { _booking_id: string; _new_status: string }
        Returns: boolean
      }
      validate_signup_code: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "provider"
      event_type: "class" | "experience" | "trip"
      pricing_type: "linear" | "predefined"
      product_type: "experience" | "trip"
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
      app_role: ["admin", "provider"],
      event_type: ["class", "experience", "trip"],
      pricing_type: ["linear", "predefined"],
      product_type: ["experience", "trip"],
    },
  },
} as const
