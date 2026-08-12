import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

/** Extrait le premier bloc JSON valide d'une réponse texte de Claude. */
export function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Réponse IA sans JSON exploitable");
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as T;
}
