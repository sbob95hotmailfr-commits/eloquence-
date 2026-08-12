import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationRoom } from "./ConversationRoom";
import type { NiveauDifficulte } from "@/types/domain";

export default async function ConversationScenarioPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;
  const supabase = await createClient();

  const { data: scenario } = await supabase
    .from("scenarios")
    .select("id, titre, role_ia, sujet, criteres_evalues")
    .eq("id", scenarioId)
    .maybeSingle();

  if (!scenario) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let niveauDepart: NiveauDifficulte = 1;
  let silenceThresholdMs = 2500;

  if (user) {
    const [{ data: progress }, { data: profile }] = await Promise.all([
      supabase
        .from("user_scenario_progress")
        .select("niveau_actuel")
        .eq("user_id", user.id)
        .eq("scenario_id", scenarioId)
        .maybeSingle(),
      supabase.from("user_profiles").select("vad_silence_seuil_ms").eq("user_id", user.id).maybeSingle(),
    ]);
    if (progress?.niveau_actuel) niveauDepart = progress.niveau_actuel as NiveauDifficulte;
    if (profile?.vad_silence_seuil_ms) silenceThresholdMs = profile.vad_silence_seuil_ms;
  }

  return (
    <main className="p-6">
      <ConversationRoom
        scenario={{
          id: scenario.id,
          titre: scenario.titre,
          role_ia: scenario.role_ia,
          sujet: scenario.sujet,
          criteres_evalues: scenario.criteres_evalues as string[],
        }}
        niveauDepart={niveauDepart}
        silenceThresholdMs={silenceThresholdMs}
      />
    </main>
  );
}
