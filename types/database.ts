export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      user_profiles: {
        Row: {
          user_id: string;
          pseudo: string | null;
          style_conflit: string | null;
          preference_ecrit_oral: string | null;
          style_naturel: string | null;
          objectif_hebdo: string | null;
          vad_silence_seuil_ms: number | null;
          heure_pratique_habituelle: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_profiles"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Row"]>;
        Relationships: [];
      };
      themes: {
        Row: { id: string; titre: string; description: string | null };
        Insert: Partial<Database["public"]["Tables"]["themes"]["Row"]> & { titre: string };
        Update: Partial<Database["public"]["Tables"]["themes"]["Row"]>;
        Relationships: [];
      };
      user_theme_preferences: {
        Row: { user_id: string; theme_id: string };
        Insert: { user_id: string; theme_id: string };
        Update: Partial<{ user_id: string; theme_id: string }>;
        Relationships: [];
      };
      scenarios: {
        Row: {
          id: string;
          theme_id: string | null;
          titre: string;
          role_ia: string;
          sujet: string;
          criteres_evalues: Json;
          niveau_min: number;
        };
        Insert: Partial<Database["public"]["Tables"]["scenarios"]["Row"]> & {
          titre: string;
          role_ia: string;
          criteres_evalues: Json;
        };
        Update: Partial<Database["public"]["Tables"]["scenarios"]["Row"]>;
        Relationships: [];
      };
      diagnostic_tests: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          scores_initiaux: Json;
          points_forts: Json;
          points_faibles: Json;
        };
        Insert: Partial<Database["public"]["Tables"]["diagnostic_tests"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["diagnostic_tests"]["Row"]>;
        Relationships: [];
      };
      programmes_personnalises: {
        Row: {
          id: string;
          user_id: string;
          semaine: number;
          sessions_suggerees: Json;
          justification: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["programmes_personnalises"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["programmes_personnalises"]["Row"]>;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          scenario_id: string | null;
          type: "lecture" | "improvisation" | "conversation";
          date: string;
          audio_url: string | null;
          transcription: string | null;
          messages: Json | null;
          duree_secondes: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["sessions"]["Row"]> & {
          user_id: string;
          type: "lecture" | "improvisation" | "conversation";
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Row"]>;
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          session_id: string;
          score_global: number;
          scores_par_critere: Json;
          points_forts: Json;
          points_faibles: Json;
          conseils_actionnables: Json;
          corrections: Json;
          auto_evaluation_utilisateur: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["feedback"]["Row"]> & {
          session_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["feedback"]["Row"]>;
        Relationships: [];
      };
      user_scenario_progress: {
        Row: {
          user_id: string;
          scenario_id: string;
          niveau_actuel: number;
          score_moyen_recent: number | null;
          nb_sessions: number;
        };
        Insert: Partial<Database["public"]["Tables"]["user_scenario_progress"]["Row"]> & {
          user_id: string;
          scenario_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_scenario_progress"]["Row"]>;
        Relationships: [];
      };
      vocabulaire_a_reviser: {
        Row: {
          id: string;
          user_id: string;
          mot: string;
          date_suggestion: string;
          reutilise: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["vocabulaire_a_reviser"]["Row"]> & {
          user_id: string;
          mot: string;
        };
        Update: Partial<Database["public"]["Tables"]["vocabulaire_a_reviser"]["Row"]>;
        Relationships: [];
      };
    };
  };
}
