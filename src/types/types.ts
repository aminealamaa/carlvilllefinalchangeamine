export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string | null;
          email: string;
          first_name: string;
          id: string;
          last_name: string;
          role: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          first_name: string;
          id?: string;
          last_name: string;
          role?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          first_name?: string;
          id?: string;
          last_name?: string;
          role?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      archived_bookings: {
        Row: {
          agent_id: string | null;
          amount: number;
          archived_at: string | null;
          client_id: string | null;
          commission_amount: number | null;
          commission_rate: number;
          created_at: string | null;
          end_date: string;
          id: string;
          payment_status: string;
          start_date: string;
          status: string;
          vehicle_id: string | null;
        };
        Insert: {
          agent_id?: string | null;
          amount: number;
          archived_at?: string | null;
          client_id?: string | null;
          commission_amount?: number | null;
          commission_rate?: number;
          created_at?: string | null;
          end_date: string;
          id?: string;
          payment_status: string;
          start_date: string;
          status: string;
          vehicle_id?: string | null;
        };
        Update: {
          agent_id?: string | null;
          amount?: number;
          archived_at?: string | null;
          client_id?: string | null;
          commission_amount?: number | null;
          commission_rate?: number;
          created_at?: string | null;
          end_date?: string;
          id?: string;
          payment_status?: string;
          start_date?: string;
          status?: string;
          vehicle_id?: string | null;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          agent_id: string | null;
          amount: number;
          client_id: string | null;
          commission_amount: number | null;
          commission_rate: number;
          created_at: string | null;
          end_date: string;
          id: string;
          payment_status: string;
          pickup_location: string | null;
          return_location: string | null;
          start_date: string;
          status: string;
          user_id: string | null;
          vehicle_id: string | null;
        };
        Insert: {
          agent_id?: string | null;
          amount: number;
          client_id?: string | null;
          commission_amount?: number | null;
          commission_rate?: number;
          created_at?: string | null;
          end_date: string;
          id?: string;
          payment_status: string;
          pickup_location?: string | null;
          return_location?: string | null;
          start_date: string;
          status: string;
          user_id?: string | null;
          vehicle_id?: string | null;
        };
        Update: {
          agent_id?: string | null;
          amount?: number;
          client_id?: string | null;
          commission_amount?: number | null;
          commission_rate?: number;
          created_at?: string | null;
          end_date?: string;
          id?: string;
          payment_status?: string;
          pickup_location?: string | null;
          return_location?: string | null;
          start_date?: string;
          status?: string;
          user_id?: string | null;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          }
        ];
      };
      clients: {
        Row: {
          created_at: string | null;
          email: string;
          end_date: string | null;
          first_name: string;
          id: string;
          id_card_number: string | null;
          last_name: string;
          payment_method: string | null;
          phone: string | null;
          start_date: string | null;
          status: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          end_date?: string | null;
          first_name: string;
          id?: string;
          id_card_number?: string | null;
          last_name: string;
          payment_method?: string | null;
          phone?: string | null;
          start_date?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          end_date?: string | null;
          first_name?: string;
          id?: string;
          id_card_number?: string | null;
          last_name?: string;
          payment_method?: string | null;
          phone?: string | null;
          start_date?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string | null;
          date: string;
          description: string;
          id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          category?: string;
          created_at?: string | null;
          date?: string;
          description: string;
          id?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string | null;
          date?: string;
          description?: string;
          id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      insurance_documents: {
        Row: {
          balance_due: number | null;
          client_id: string | null;
          created_at: string | null;
          description: string | null;
          document_url: string | null;
          expires_at: string | null;
          id: string;
          images: string[] | null;
          name: string;
          payment_amount: number | null;
          policy_number: string | null;
          repair_cost: number | null;
          signed: boolean | null;
          status: string;
          type: string;
          user_id: string | null;
          vehicle_id: string | null;
        };
        Insert: {
          balance_due?: number | null;
          client_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          document_url?: string | null;
          expires_at?: string | null;
          id?: string;
          images?: string[] | null;
          name: string;
          payment_amount?: number | null;
          policy_number?: string | null;
          repair_cost?: number | null;
          signed?: boolean | null;
          status: string;
          type: string;
          user_id?: string | null;
          vehicle_id?: string | null;
        };
        Update: {
          balance_due?: number | null;
          client_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          document_url?: string | null;
          expires_at?: string | null;
          id?: string;
          images?: string[] | null;
          name?: string;
          payment_amount?: number | null;
          policy_number?: string | null;
          repair_cost?: number | null;
          signed?: boolean | null;
          status?: string;
          type?: string;
          user_id?: string | null;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "insurance_documents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "insurance_documents_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          id: string;
          job_title: Database["public"]["Enums"]["role"] | null;
          name: string | null;
          phone: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          job_title?: Database["public"]["Enums"]["role"] | null;
          name?: string | null;
          phone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          job_title?: Database["public"]["Enums"]["role"] | null;
          name?: string | null;
          phone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          agent_id: string;
          client_id: string;
          commission_amount: number;
          created_at: string | null;
          end_date: string;
          id: string;
          price_total: number;
          start_date: string;
          status: string;
          vehicle_id: string;
        };
        Insert: {
          agent_id: string;
          client_id: string;
          commission_amount: number;
          created_at?: string | null;
          end_date: string;
          id?: string;
          price_total: number;
          start_date: string;
          status: string;
          vehicle_id: string;
        };
        Update: {
          agent_id?: string;
          client_id?: string;
          commission_amount?: number;
          created_at?: string | null;
          end_date?: string;
          id?: string;
          price_total?: number;
          start_date?: string;
          status?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          }
        ];
      };
      sales_representatives: {
        Row: {
          commission_rate: number;
          created_at: string | null;
          email: string;
          id: string;
          name: string;
          phone: string | null;
          quota: number;
          sales_count: number;
        };
        Insert: {
          commission_rate?: number;
          created_at?: string | null;
          email: string;
          id?: string;
          name: string;
          phone?: string | null;
          quota?: number;
          sales_count?: number;
        };
        Update: {
          commission_rate?: number;
          created_at?: string | null;
          email?: string;
          id?: string;
          name?: string;
          phone?: string | null;
          quota?: number;
          sales_count?: number;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          availability: boolean | null;
          brand: string;
          car_img: string | null;
          created_at: string | null;
          fuel_type: string | null;
          id: string;
          kilometrage: number | null;
          model: string;
          next_vidange: string | null;
          plate_number: string;
          price: number;
          status: string;
          transmission: string | null;
          user_id: string | null;
          year: string | null;
        };
        Insert: {
          availability?: boolean | null;
          brand: string;
          car_img?: string | null;
          created_at?: string | null;
          fuel_type?: string | null;
          id?: string;
          kilometrage?: number | null;
          model: string;
          next_vidange?: string | null;
          plate_number: string;
          price: number;
          status: string;
          transmission?: string | null;
          user_id?: string | null;
          year?: string | null;
        };
        Update: {
          availability?: boolean | null;
          brand?: string;
          car_img?: string | null;
          created_at?: string | null;
          fuel_type?: string | null;
          id?: string;
          kilometrage?: number | null;
          model?: string;
          next_vidange?: string | null;
          plate_number?: string;
          price?: number;
          status?: string;
          transmission?: string | null;
          user_id?: string | null;
          year?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      archive_old_bookings: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      role: "admin" | "commercial" | "agent";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      role: ["admin", "commercial", "agent"],
    },
  },
} as const;
