export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_members: {
        Row: {
          id: string;
          campaign_id: string;
          user_id: string;
          role: "admin" | "gm" | "player";
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          user_id: string;
          role: "admin" | "gm" | "player";
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          user_id?: string;
          role?: "admin" | "gm" | "player";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      characters: {
        Row: {
          id: string;
          campaign_id: string | null; // NULL for standalone characters
          name: string;
          player_name: string | null;
          character_name: string | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null; // NULL for standalone characters
          name: string;
          player_name?: string | null;
          character_name?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          name?: string;
          player_name?: string | null;
          character_name?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "characters_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "characters_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_invitations: {
        Row: {
          id: string;
          campaign_id: string;
          invited_email: string;
          invited_by: string;
          roles_offered: {
            isAdmin: boolean;
            isGm: boolean;
            isPlayer: boolean;
          };
          status: "pending" | "accepted" | "declined" | "expired";
          expires_at: string | null;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          invited_email: string;
          invited_by: string;
          roles_offered?: {
            isAdmin: boolean;
            isGm: boolean;
            isPlayer: boolean;
          };
          status?: "pending" | "accepted" | "declined" | "expired";
          expires_at?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          invited_email?: string;
          invited_by?: string;
          roles_offered?: {
            isAdmin: boolean;
            isGm: boolean;
            isPlayer: boolean;
          };
          status?: "pending" | "accepted" | "declined" | "expired";
          expires_at?: string | null;
          created_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_invitations_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_campaign_role: {
        Args: {
          campaign_uuid: string;
          user_uuid: string;
        };
        Returns: string | null;
      };
    };
    Enums: {
      user_role: "admin" | "gm" | "player";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
