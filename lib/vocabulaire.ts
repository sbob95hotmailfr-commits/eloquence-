import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { FeedbackResult } from "@/types/domain";

/** Extrait des mots ou courtes expressions suggérés à partir des corrections du feedback. */
export function extractSuggestedWords(feedback: FeedbackResult): string[] {
  return feedback.corrections
    .map((c) => c.suggestion.trim())
    .filter((s) => s.length > 0 && s.split(/\s+/).length <= 3)
    .slice(0, 5);
}

export async function saveSuggestedVocabulary(
  supabase: SupabaseClient<Database>,
  userId: string,
  feedback: FeedbackResult
) {
  const words = extractSuggestedWords(feedback);
  if (words.length === 0) return;
  await supabase.from("vocabulaire_a_reviser").insert(words.map((mot) => ({ user_id: userId, mot })));
}

/** Marque comme réutilisés les mots suggérés qui apparaissent dans une nouvelle transcription. */
export async function markVocabularyReused(
  supabase: SupabaseClient<Database>,
  userId: string,
  transcription: string
) {
  const { data: pending } = await supabase
    .from("vocabulaire_a_reviser")
    .select("id, mot")
    .eq("user_id", userId)
    .eq("reutilise", false);

  const lower = transcription.toLowerCase();
  const reused = (pending ?? []).filter((v) => lower.includes(v.mot.toLowerCase()));

  for (const v of reused) {
    await supabase.from("vocabulaire_a_reviser").update({ reutilise: true }).eq("id", v.id);
  }
}
