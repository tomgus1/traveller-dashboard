export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ammo_tracker: {
        Row: {
          ammo_type: string | null;
          campaign_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          loose_rounds: number | null;
          magazine_size: number | null;
          notes: string | null;
          rounds_loaded: number | null;
          spare_magazines: number | null;
          total_rounds: number | null;
          updated_at: string;
          weapon: string;
        };
        Insert: {
          ammo_type?: string | null;
          campaign_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          loose_rounds?: number | null;
          magazine_size?: number | null;
          notes?: string | null;
          rounds_loaded?: number | null;
          spare_magazines?: number | null;
          total_rounds?: number | null;
          updated_at?: string;
          weapon: string;
        };
        Update: {
          ammo_type?: string | null;
          campaign_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          loose_rounds?: number | null;
          magazine_size?: number | null;
          notes?: string | null;
          rounds_loaded?: number | null;
          spare_magazines?: number | null;
          total_rounds?: number | null;
          updated_at?: string;
          weapon?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ammo_tracker_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ammo_tracker_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_members: {
        Row: {
          campaign_id: string;
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
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
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      character_ammo: {
        Row: {
          ammo_type: string | null;
          character_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          loose_rounds: number | null;
          magazine_size: number | null;
          notes: string | null;
          rounds_loaded: number | null;
          spare_magazines: number | null;
          total_rounds: number | null;
          updated_at: string;
          weapon: string;
        };
        Insert: {
          ammo_type?: string | null;
          character_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          loose_rounds?: number | null;
          magazine_size?: number | null;
          notes?: string | null;
          rounds_loaded?: number | null;
          spare_magazines?: number | null;
          total_rounds?: number | null;
          updated_at?: string;
          weapon: string;
        };
        Update: {
          ammo_type?: string | null;
          character_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          loose_rounds?: number | null;
          magazine_size?: number | null;
          notes?: string | null;
          rounds_loaded?: number | null;
          spare_magazines?: number | null;
          total_rounds?: number | null;
          updated_at?: string;
          weapon?: string;
        };
        Relationships: [
          {
            foreignKeyName: "character_ammo_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "character_ammo_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      characters: {
        Row: {
          campaign_id: string;
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
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
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      party_finances: {
        Row: {
          amount_cr: number;
          campaign_id: string;
          category: string;
          created_at: string;
          created_by: string | null;
          date: string;
          description: string;
          id: string;
          notes: string | null;
          paid_by: string | null;
          paid_from_fund: string | null;
          running_total: number | null;
          subcategory: string | null;
          updated_at: string;
        };
        Insert: {
          amount_cr: number;
          campaign_id: string;
          category: string;
          created_at?: string;
          created_by?: string | null;
          date: string;
          description: string;
          id?: string;
          notes?: string | null;
          paid_by?: string | null;
          paid_from_fund?: string | null;
          running_total?: number | null;
          subcategory?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_cr?: number;
          campaign_id?: string;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          date?: string;
          description?: string;
          id?: string;
          notes?: string | null;
          paid_by?: string | null;
          paid_from_fund?: string | null;
          running_total?: number | null;
          subcategory?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "party_finances_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "party_finances_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
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
        Returns: string;
      };
      user_owns_character: {
        Args: {
          character_uuid: string;
          user_uuid: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
