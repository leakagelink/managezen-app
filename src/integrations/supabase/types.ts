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
      account_deletion_jobs: {
        Row: {
          last_error: string | null
          started_at: string
          status: string
          step: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_error?: string | null
          started_at?: string
          status?: string
          step?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_error?: string | null
          started_at?: string
          status?: string
          step?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          new_status: string | null
          old_status: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          email: string
          email_hash: string | null
          id: string
          reason: string
          request_no: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verify_expires_at: string | null
          verify_hash: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email: string
          email_hash?: string | null
          id?: string
          reason?: string
          request_no?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verify_expires_at?: string | null
          verify_hash?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email?: string
          email_hash?: string | null
          id?: string
          reason?: string
          request_no?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verify_expires_at?: string | null
          verify_hash?: string | null
        }
        Relationships: []
      }
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
          files_attached: boolean
          id: string
          offer_code: string
          requirements: string
          service: string
          status: string
          total: number
          tracking_code: string
          upload_attempts: number
          upload_claim: string | null
          upload_claimed_at: string | null
          upload_state: string
          upload_token: string
        }
        Insert: {
          attachments?: Json
          client_email: string
          client_name: string
          client_phone?: string
          country?: string
          created_at?: string
          files_attached?: boolean
          id?: string
          offer_code?: string
          requirements?: string
          service: string
          status?: string
          total?: number
          tracking_code?: string
          upload_attempts?: number
          upload_claim?: string | null
          upload_claimed_at?: string | null
          upload_state?: string
          upload_token?: string
        }
        Update: {
          attachments?: Json
          client_email?: string
          client_name?: string
          client_phone?: string
          country?: string
          created_at?: string
          files_attached?: boolean
          id?: string
          offer_code?: string
          requirements?: string
          service?: string
          status?: string
          total?: number
          tracking_code?: string
          upload_attempts?: number
          upload_claim?: string | null
          upload_claimed_at?: string | null
          upload_state?: string
          upload_token?: string
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
      rate_limits: {
        Row: {
          bucket: string
          created_at: string
          id: string
          key_hash: string
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: string
          key_hash: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          key_hash?: string
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
      available_payout: { Args: { _user: string }; Returns: number }
      claim_deletion_job: { Args: { _user: string }; Returns: boolean }
      claim_request_upload: {
        Args: { _token: string; _tracking: string }
        Returns: string
      }
      find_user_id_by_email: { Args: { _email: string }; Returns: string }
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
      my_available_payout: { Args: never; Returns: number }
      purge_expired_records: { Args: never; Returns: undefined }
      request_account_deletion: {
        Args: { _email: string; _reason: string }
        Returns: string
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
      submit_project_request_v2: {
        Args: {
          _country: string
          _email: string
          _name: string
          _offer_code: string
          _phone: string
          _requirements: string
        }
        Returns: {
          tracking_code: string
          upload_token: string
        }[]
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
