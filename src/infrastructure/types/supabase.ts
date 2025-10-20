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
      campaign_invitations: {
        Row: {
          accepted_at: string | null
          campaign_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          invited_by: string
          invited_email: string
          roles_offered: Json
          status: string
        }
        Insert: {
          accepted_at?: string | null
          campaign_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by: string
          invited_email: string
          roles_offered?: Json
          status?: string
        }
        Update: {
          accepted_at?: string | null
          campaign_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string
          invited_email?: string
          roles_offered?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_invitations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_members: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          is_admin: boolean
          is_gm: boolean
          is_player: boolean
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          is_admin?: boolean
          is_gm?: boolean
          is_player?: boolean
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          is_admin?: boolean
          is_gm?: boolean
          is_player?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_members_backup_yyyymmddhh24: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string | null
          is_admin: boolean | null
          is_gm: boolean | null
          is_player: boolean | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string | null
          is_admin?: boolean | null
          is_gm?: boolean | null
          is_player?: boolean | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string | null
          is_admin?: boolean | null
          is_gm?: boolean | null
          is_player?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      character_ammo: {
        Row: {
          character_id: string
          created_at: string | null
          id: string
          max_quantity: number | null
          notes: string | null
          quantity: number | null
          type: string
          weapon_compatibility: string | null
        }
        Insert: {
          character_id: string
          created_at?: string | null
          id?: string
          max_quantity?: number | null
          notes?: string | null
          quantity?: number | null
          type: string
          weapon_compatibility?: string | null
        }
        Update: {
          character_id?: string
          created_at?: string | null
          id?: string
          max_quantity?: number | null
          notes?: string | null
          quantity?: number | null
          type?: string
          weapon_compatibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_ammo_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_armour: {
        Row: {
          character_id: string
          cost: number | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          protection: number | null
          weight: number | null
        }
        Insert: {
          character_id: string
          cost?: number | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          protection?: number | null
          weight?: number | null
        }
        Update: {
          character_id?: string
          cost?: number | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          protection?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "character_armour_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_finance: {
        Row: {
          amount: number
          character_id: string
          created_at: string | null
          description: string
          id: string
          transaction_date: string | null
        }
        Insert: {
          amount: number
          character_id: string
          created_at?: string | null
          description: string
          id?: string
          transaction_date?: string | null
        }
        Update: {
          amount?: number
          character_id?: string
          created_at?: string | null
          description?: string
          id?: string
          transaction_date?: string | null
        }
        Relationships: []
      }
      character_inventory: {
        Row: {
          character_id: string
          created_at: string | null
          description: string | null
          id: string
          item_name: string
          quantity: number | null
          value: number | null
          weight: number | null
        }
        Insert: {
          character_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          item_name: string
          quantity?: number | null
          value?: number | null
          weight?: number | null
        }
        Update: {
          character_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          item_name?: string
          quantity?: number | null
          value?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "character_inventory_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_weapons: {
        Row: {
          character_id: string
          cost: number | null
          created_at: string | null
          damage: string | null
          id: string
          name: string
          notes: string | null
          range: string | null
          weight: number | null
        }
        Insert: {
          character_id: string
          cost?: number | null
          created_at?: string | null
          damage?: string | null
          id?: string
          name: string
          notes?: string | null
          range?: string | null
          weight?: number | null
        }
        Update: {
          character_id?: string
          cost?: number | null
          created_at?: string | null
          damage?: string | null
          id?: string
          name?: string
          notes?: string | null
          range?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "character_weapons_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          campaign_id: string | null
          character_name: string | null
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          player_name: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          character_name?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          player_name?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          character_name?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          player_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "characters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invitations: {
        Row: {
          accepted_at: string | null
          campaign_id: string
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          role: string
        }
        Insert: {
          accepted_at?: string | null
          campaign_id: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          role: string
        }
        Update: {
          accepted_at?: string | null
          campaign_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_invitations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          profile_completed: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          profile_completed?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          profile_completed?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_campaign_invitation: {
        Args: { p_invitation_id: string; p_user_id: string }
        Returns: boolean
      }
      create_campaign_invitation: {
        Args: {
          p_campaign_id: string
          p_invited_by: string
          p_invited_email: string
          p_roles_offered: Json
        }
        Returns: string
      }
      create_standalone_character: {
        Args: {
          char_name: string
          character_name?: string
          player_name?: string
          user_id: string
        }
        Returns: Json
      }
      debug_campaign_permissions: {
        Args: Record<PropertyKey, never>
        Returns: {
          can_create_campaign: boolean
          has_profile: boolean
          user_email: string
          user_id: string
        }[]
      }
      decline_campaign_invitation: {
        Args: { p_invitation_id: string }
        Returns: boolean
      }
      get_user_campaign_role: {
        Args: { campaign_uuid: string; user_uuid: string }
        Returns: string
      }
      get_user_invitations: {
        Args: { p_user_email: string }
        Returns: {
          campaign_description: string
          campaign_id: string
          campaign_name: string
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string
          inviter_email: string
          inviter_name: string
          roles_offered: Json
          status: string
        }[]
      }
      get_user_profile_data: {
        Args: { user_uuid: string }
        Returns: Json
      }
      send_campaign_invitation: {
        Args: {
          p_campaign_id: string
          p_campaign_name: string
          p_email: string
          p_inviter_name: string
          p_role: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "gm" | "player"
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
      user_role: ["admin", "gm", "player"],
    },
  },
} as const
