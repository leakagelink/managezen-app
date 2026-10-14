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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          base: number
          code: string
          created_at: string
          id: string
          price: number
          reason: string | null
          service: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          base: number
          code?: string
          created_at?: string
          id?: string
          price: number
          reason?: string | null
          service: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          base?: number
          code?: string
          created_at?: string
          id?: string
          price?: number
          reason?: string | null
          service?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          details: string
          id: string
          method: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          details?: string
          id?: string
          method?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          details?: string
          id?: string
          method?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string
          created_at: string
          currency: string
          id: string
          legal_name: string
          phone: string
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          currency?: string
          id: string
          legal_name?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          currency?: string
          id?: string
          legal_name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_requests: {
        Row: {
          attachments: Json
          client_email: string
          client_name: string
          client_phone: string
          country: string
          created_at: string
          id: string
          offer_code: string
          requirements: string
          service: string
          status: string
          total: number
          tracking_code: string
        }
        Insert: {
          attachments?: Json
          client_email: string
          client_name: string
          client_phone?: string
          country?: string
          created_at?: string
          id?: string
          offer_code?: string
          requirements?: string
          service: string
          status?: string
          total?: number
          tracking_code?: string
        }
        Update: {
          attachments?: Json
          client_email?: string
          client_name?: string
          client_phone?: string
          country?: string
          created_at?: string
          id?: string
          offer_code?: string
          requirements?: string
          service?: string
          status?: string
          total?: number
          tracking_code?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          country: string
          created_at: string
          customer_email: string
          customer_id: string | null
          id: string
          progress: number
          service: string
          stage: string
          total: number
          tracking_code: string
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          id?: string
          progress?: number
          service: string
          stage?: string
          total?: number
          tracking_code?: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          id?: string
          progress?: number
          service?: string
          stage?: string
          total?: number
          tracking_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          client_contact: string
          client_name: string
          created_at: string
          fee: number
          id: string
          service: string
          status: string
          user_id: string
        }
        Insert: {
          client_contact?: string
          client_name: string
          created_at?: string
          fee?: number
          id?: string
          service: string
          status?: string
          user_id: string
        }
        Update: {
          client_contact?: string
          client_name?: string
          created_at?: string
          fee?: number
          id?: string
          service?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      attach_request_files: {
        Args: { _paths: string[]; _tracking_code: string }
        Returns: undefined
      }
      get_public_offer: {
        Args: { _code: string }
        Returns: {
          code: string
          price: number
          service: string
          status: string
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_project_request: {
        Args: {
          _country: string
          _email: string
          _name: string
          _offer_code: string
          _phone: string
          _requirements: string
        }
        Returns: string
      }
      track_project: {
        Args: { _code: string }
        Returns: {
          progress: number
          service: string
          stage: string
          tracking_code: string
          updated_at: string
        }[]
      }
      track_request: {
        Args: { _code: string }
        Returns: {
          country: string
          progress: number
          service: string
          stage: string
          tracking_code: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "reseller" | "referrer" | "customer"
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
    Enums: {
      app_role: ["admin", "reseller", "referrer", "customer"],
    },
  },
} as const
