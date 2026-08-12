import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Progression adaptative : la difficulté d'un scénario évolue via une
 * moyenne mobile des scores récents (pondération 70% historique / 30%
 * nouvelle session, pour lisser sans figer trop longtemps un mauvais jour).
 */
export async function updateScenarioProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
  scenarioId: string,
  newScore: number
) {
  const { data: current } = await supabase
    .from("user_scenario_progress")
    .select("niveau_actuel, score_moyen_recent, nb_sessions")
    .eq("user_id", userId)
    .eq("scenario_id", scenarioId)
    .maybeSingle();

  const previousAverage = current?.score_moyen_recent ?? newScore;
  const movingAverage = current ? previousAverage * 0.7 + newScore * 0.3 : newScore;

  let niveau = current?.niveau_actuel ?? 1;
  if (movingAverage >= 8 && niveau < 3) niveau += 1;
  else if (movingAverage < 4 && niveau > 1) niveau -= 1;

  await supabase.from("user_scenario_progress").upsert({
    user_id: userId,
    scenario_id: scenarioId,
    niveau_actuel: niveau,
    score_moyen_recent: movingAverage,
    nb_sessions: (current?.nb_sessions ?? 0) + 1,
  });

  return { niveau, movingAverage };
}
