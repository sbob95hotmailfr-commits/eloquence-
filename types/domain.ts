export interface FeedbackPointCite {
  constat: string;
  exemple_transcription: string;
}

export interface FeedbackCorrection {
  erreur: string;
  suggestion: string;
  explication: string;
}

export interface FeedbackResult {
  score_global: number;
  scores_par_critere: Record<string, number>;
  points_forts: FeedbackPointCite[];
  points_faibles: FeedbackPointCite[];
  conseils_actionnables: string[];
  corrections: FeedbackCorrection[];
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export type NiveauDifficulte = 1 | 2 | 3;

export interface ScenarioContext {
  nom_scenario: string;
  role_ia: string;
  sujet: string;
  niveau_difficulte: NiveauDifficulte;
  criteres_evalues: string[];
}
