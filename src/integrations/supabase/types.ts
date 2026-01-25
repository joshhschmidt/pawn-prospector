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
      coaching_reports: {
        Row: {
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          id: string
          recommendations: Json | null
          report_date: string
          strengths: Json | null
          total_games: number | null
          training_plan: Json | null
          user_id: string
          weaknesses: Json | null
        }
        Insert: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          recommendations?: Json | null
          report_date?: string
          strengths?: Json | null
          total_games?: number | null
          training_plan?: Json | null
          user_id: string
          weaknesses?: Json | null
        }
        Update: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          recommendations?: Json | null
          report_date?: string
          strengths?: Json | null
          total_games?: number | null
          training_plan?: Json | null
          user_id?: string
          weaknesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_features: {
        Row: {
          created_at: string
          feature_name: string
          feature_value: number | null
          game_id: string
          id: string
        }
        Insert: {
          created_at?: string
          feature_name: string
          feature_value?: number | null
          game_id: string
          id?: string
        }
        Update: {
          created_at?: string
          feature_name?: string
          feature_value?: number | null
          game_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_features_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          castled_at_ply: number | null
          created_at: string
          early_checks_received: number | null
          game_date: string | null
          game_url: string | null
          id: string
          is_quick_loss: boolean | null
          is_quick_win: boolean | null
          moves: string[] | null
          nc7_fork_detected: boolean | null
          opening_bucket: Database["public"]["Enums"]["opening_bucket"] | null
          opponent_name: string | null
          opponent_rating: number | null
          pgn_raw: string | null
          player_color: string
          player_rating: number | null
          queen_moves_first_10: number | null
          queen_tempo_loss: boolean | null
          result: Database["public"]["Enums"]["game_result"]
          time_control: Database["public"]["Enums"]["time_control"] | null
          total_moves: number | null
          user_id: string
        }
        Insert: {
          castled_at_ply?: number | null
          created_at?: string
          early_checks_received?: number | null
          game_date?: string | null
          game_url?: string | null
          id?: string
          is_quick_loss?: boolean | null
          is_quick_win?: boolean | null
          moves?: string[] | null
          nc7_fork_detected?: boolean | null
          opening_bucket?: Database["public"]["Enums"]["opening_bucket"] | null
          opponent_name?: string | null
          opponent_rating?: number | null
          pgn_raw?: string | null
          player_color: string
          player_rating?: number | null
          queen_moves_first_10?: number | null
          queen_tempo_loss?: boolean | null
          result: Database["public"]["Enums"]["game_result"]
          time_control?: Database["public"]["Enums"]["time_control"] | null
          total_moves?: number | null
          user_id: string
        }
        Update: {
          castled_at_ply?: number | null
          created_at?: string
          early_checks_received?: number | null
          game_date?: string | null
          game_url?: string | null
          id?: string
          is_quick_loss?: boolean | null
          is_quick_win?: boolean | null
          moves?: string[] | null
          nc7_fork_detected?: boolean | null
          opening_bucket?: Database["public"]["Enums"]["opening_bucket"] | null
          opponent_name?: string | null
          opponent_rating?: number | null
          pgn_raw?: string | null
          player_color?: string
          player_rating?: number | null
          queen_moves_first_10?: number | null
          queen_tempo_loss?: boolean | null
          result?: Database["public"]["Enums"]["game_result"]
          time_control?: Database["public"]["Enums"]["time_control"] | null
          total_moves?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tactical_patterns: {
        Row: {
          category: string
          created_at: string
          difficulty: string
          fen: string
          id: string
          key_idea: string
          moves: string[]
          name: string
          play_as: string
          tags: string[] | null
        }
        Insert: {
          category: string
          created_at?: string
          difficulty: string
          fen: string
          id?: string
          key_idea: string
          moves: string[]
          name: string
          play_as: string
          tags?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string
          difficulty?: string
          fen?: string
          id?: string
          key_idea?: string
          moves?: string[]
          name?: string
          play_as?: string
          tags?: string[] | null
        }
        Relationships: []
      }
      users: {
        Row: {
          chess_com_username: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          chess_com_username: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          chess_com_username?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      game_result: "win" | "loss" | "draw"
      opening_bucket:
        | "italian_game"
        | "ruy_lopez"
        | "scotch_game"
        | "kings_gambit"
        | "vienna_game"
        | "bishops_opening"
        | "four_knights"
        | "petrov_defense"
        | "center_game"
        | "danish_gambit"
        | "ponziani"
        | "london_system"
        | "queens_gambit"
        | "catalan"
        | "trompowsky"
        | "colle_system"
        | "torre_attack"
        | "veresov"
        | "blackmar_diemer"
        | "richter_veresov"
        | "english_opening"
        | "reti_opening"
        | "kings_indian_attack"
        | "birds_opening"
        | "larsen_opening"
        | "grob_attack"
        | "other_white"
        | "sicilian_najdorf"
        | "sicilian_dragon"
        | "sicilian_scheveningen"
        | "sicilian_sveshnikov"
        | "sicilian_classical"
        | "sicilian_kan"
        | "sicilian_taimanov"
        | "sicilian_accelerated_dragon"
        | "sicilian_alapin"
        | "sicilian_closed"
        | "sicilian_other"
        | "french_defense"
        | "caro_kann"
        | "scandinavian"
        | "alekhine_defense"
        | "pirc_defense"
        | "modern_defense"
        | "philidor_defense"
        | "owen_defense"
        | "kings_pawn_other"
        | "kings_indian"
        | "grunfeld"
        | "nimzo_indian"
        | "queens_indian"
        | "bogo_indian"
        | "benoni"
        | "dutch_defense"
        | "slav_defense"
        | "semi_slav"
        | "queens_gambit_declined"
        | "queens_gambit_accepted"
        | "tarrasch_defense"
        | "chigorin_defense"
        | "budapest_gambit"
        | "benko_gambit"
        | "d4_other"
        | "english_symmetrical"
        | "anglo_indian"
        | "other_black"
      time_control:
        | "bullet"
        | "blitz"
        | "rapid"
        | "classical"
        | "correspondence"
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
      game_result: ["win", "loss", "draw"],
      opening_bucket: [
        "italian_game",
        "ruy_lopez",
        "scotch_game",
        "kings_gambit",
        "vienna_game",
        "bishops_opening",
        "four_knights",
        "petrov_defense",
        "center_game",
        "danish_gambit",
        "ponziani",
        "london_system",
        "queens_gambit",
        "catalan",
        "trompowsky",
        "colle_system",
        "torre_attack",
        "veresov",
        "blackmar_diemer",
        "richter_veresov",
        "english_opening",
        "reti_opening",
        "kings_indian_attack",
        "birds_opening",
        "larsen_opening",
        "grob_attack",
        "other_white",
        "sicilian_najdorf",
        "sicilian_dragon",
        "sicilian_scheveningen",
        "sicilian_sveshnikov",
        "sicilian_classical",
        "sicilian_kan",
        "sicilian_taimanov",
        "sicilian_accelerated_dragon",
        "sicilian_alapin",
        "sicilian_closed",
        "sicilian_other",
        "french_defense",
        "caro_kann",
        "scandinavian",
        "alekhine_defense",
        "pirc_defense",
        "modern_defense",
        "philidor_defense",
        "owen_defense",
        "kings_pawn_other",
        "kings_indian",
        "grunfeld",
        "nimzo_indian",
        "queens_indian",
        "bogo_indian",
        "benoni",
        "dutch_defense",
        "slav_defense",
        "semi_slav",
        "queens_gambit_declined",
        "queens_gambit_accepted",
        "tarrasch_defense",
        "chigorin_defense",
        "budapest_gambit",
        "benko_gambit",
        "d4_other",
        "english_symmetrical",
        "anglo_indian",
        "other_black",
      ],
      time_control: ["bullet", "blitz", "rapid", "classical", "correspondence"],
    },
  },
} as const
