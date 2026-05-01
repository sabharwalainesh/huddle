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
      bookmarks: {
        Row: {
          business_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_insights_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "bookmarks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "trending_pulse"
            referencedColumns: ["business_id"]
          },
        ]
      }
      business_views: {
        Row: {
          business_id: string
          created_at: string
          id: string
          viewer_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          viewer_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          viewer_id?: string | null
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address: string | null
          ai_review_notes: string | null
          ai_review_status: Database["public"]["Enums"]["ai_review_status"]
          avg_rating: number
          category: string
          created_at: string
          description: string
          editorial_tags: string[] | null
          founder_bio: string | null
          founder_name: string | null
          founder_photo_url: string | null
          hours: Json
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          name: string
          owner_id: string | null
          phone: string | null
          proof_document_url: string | null
          rejection_reason: string | null
          review_count: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["business_status"]
          submitted_at: string | null
          tags: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          ai_review_notes?: string | null
          ai_review_status?: Database["public"]["Enums"]["ai_review_status"]
          avg_rating?: number
          category: string
          created_at?: string
          description?: string
          editorial_tags?: string[] | null
          founder_bio?: string | null
          founder_name?: string | null
          founder_photo_url?: string | null
          hours?: Json
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          owner_id?: string | null
          phone?: string | null
          proof_document_url?: string | null
          rejection_reason?: string | null
          review_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          submitted_at?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          ai_review_notes?: string | null
          ai_review_status?: Database["public"]["Enums"]["ai_review_status"]
          avg_rating?: number
          category?: string
          created_at?: string
          description?: string
          editorial_tags?: string[] | null
          founder_bio?: string | null
          founder_name?: string | null
          founder_photo_url?: string | null
          hours?: Json
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          proof_document_url?: string | null
          rejection_reason?: string | null
          review_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          submitted_at?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          business_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_insights_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "check_ins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "trending_pulse"
            referencedColumns: ["business_id"]
          },
        ]
      }
      coupons: {
        Row: {
          business_id: string
          code: string | null
          created_at: string
          description: string
          discount: string | null
          expires_at: string
          id: string
          owner_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          code?: string | null
          created_at?: string
          description?: string
          discount?: string | null
          expires_at: string
          id?: string
          owner_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          code?: string | null
          created_at?: string
          description?: string
          discount?: string | null
          expires_at?: string
          id?: string
          owner_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_insights_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "coupons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "trending_pulse"
            referencedColumns: ["business_id"]
          },
        ]
      }
      featured_businesses: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          note: string | null
          starts_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          note?: string | null
          starts_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          note?: string | null
          starts_at?: string
        }
        Relationships: []
      }
      google_place_cache: {
        Row: {
          business_id: string
          created_at: string
          fetched_at: string
          id: string
          payload: Json
          place_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          fetched_at?: string
          id?: string
          payload?: Json
          place_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          fetched_at?: string
          id?: string
          payload?: Json
          place_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          owns_business: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          owns_business?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          owns_business?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          business_id: string
          comment: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          business_id: string
          comment?: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          business_id?: string
          comment?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_insights_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "trending_pulse"
            referencedColumns: ["business_id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          categories: string[]
          created_at: string
          id: string
          updated_at: string
          user_id: string
          vibes: string[]
        }
        Insert: {
          categories?: string[]
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          vibes?: string[]
        }
        Update: {
          categories?: string[]
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          vibes?: string[]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_coupons: {
        Row: {
          business_id: string | null
          code: string | null
          created_at: string | null
          description: string | null
          discount: string | null
          expires_at: string | null
          id: string | null
          owner_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          discount?: string | null
          expires_at?: string | null
          id?: string | null
          owner_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          discount?: string | null
          expires_at?: string | null
          id?: string | null
          owner_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_insights_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "coupons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "trending_pulse"
            referencedColumns: ["business_id"]
          },
        ]
      }
      business_insights_summary: {
        Row: {
          avg_rating: number | null
          business_id: string | null
          category: string | null
          check_ins_30d: number | null
          name: string | null
          owner_id: string | null
          review_count: number | null
          status: Database["public"]["Enums"]["business_status"] | null
          total_bookmarks: number | null
          total_check_ins: number | null
          total_views: number | null
          unique_viewers: number | null
          views_30d: number | null
        }
        Insert: {
          avg_rating?: number | null
          business_id?: string | null
          category?: string | null
          check_ins_30d?: never
          name?: string | null
          owner_id?: string | null
          review_count?: number | null
          status?: Database["public"]["Enums"]["business_status"] | null
          total_bookmarks?: never
          total_check_ins?: never
          total_views?: never
          unique_viewers?: never
          views_30d?: never
        }
        Update: {
          avg_rating?: number | null
          business_id?: string | null
          category?: string | null
          check_ins_30d?: never
          name?: string | null
          owner_id?: string | null
          review_count?: number | null
          status?: Database["public"]["Enums"]["business_status"] | null
          total_bookmarks?: never
          total_check_ins?: never
          total_views?: never
          unique_viewers?: never
          views_30d?: never
        }
        Relationships: []
      }
      trending_pulse: {
        Row: {
          avg_rating: number | null
          business_id: string | null
          category: string | null
          image_url: string | null
          name: string | null
          pulse_score: number | null
          recent_bookmarks: number | null
          recent_check_ins: number | null
        }
        Insert: {
          avg_rating?: number | null
          business_id?: string | null
          category?: string | null
          image_url?: string | null
          name?: string | null
          pulse_score?: never
          recent_bookmarks?: never
          recent_check_ins?: never
        }
        Update: {
          avg_rating?: number | null
          business_id?: string | null
          category?: string | null
          image_url?: string | null
          name?: string | null
          pulse_score?: never
          recent_bookmarks?: never
          recent_check_ins?: never
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      ai_review_status: "not_run" | "passed" | "flagged" | "error"
      app_role: "admin" | "business_owner" | "customer"
      business_status:
        | "draft"
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
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
      ai_review_status: ["not_run", "passed", "flagged", "error"],
      app_role: ["admin", "business_owner", "customer"],
      business_status: [
        "draft",
        "pending",
        "under_review",
        "approved",
        "rejected",
      ],
    },
  },
} as const
