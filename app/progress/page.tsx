import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/Card";
import { ProgressLineChart, CompetenceRadar } from "@/components/progress/ProgressCharts";
import { computeCurrentStreak } from "@/lib/streaks";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <main className="p-6">Connectez-vous pour voir votre progression.</main>;
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, date, scenario_id, type")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  const scenarioIds = [...new Set((sessions ?? []).map((s) => s.scenario_id).filter((id): id is string => !!id))];
  const { data: scenarioRows } = scenarioIds.length
    ? await supabase.from("scenarios").select("id, titre").in("id", scenarioIds)
    : { data: [] };
  const scenarioTitleById = new Map((scenarioRows ?? []).map((s) => [s.id, s.titre]));

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: feedbacks } = sessionIds.length
    ? await supabase.from("feedback").select("session_id, score_global, scores_par_critere").in("session_id", sessionIds)
    : { data: [] };

  const { data: vocabulaire } = await supabase
    .from("vocabulaire_a_reviser")
    .select("id, mot, reutilise")
    .eq("user_id", user.id)
    .order("date_suggestion", { ascending: false })
    .limit(20);

  const feedbackBySession = new Map((feedbacks ?? []).map((f) => [f.session_id, f]));

  const lineData = (sessions ?? [])
    .map((s) => {
      const fb = feedbackBySession.get(s.id);
      if (!fb) return null;
      return { date: new Date(s.date!).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), score: fb.score_global };
    })
    .filter((d): d is { date: string; score: number } => d !== null);

  const criteresAgg = new Map<string, { sum: number; count: number }>();
  for (const fb of feedbacks ?? []) {
    const scores = fb.scores_par_critere as Record<string, number> | null;
    if (!scores) continue;
    for (const [critere, score] of Object.entries(scores)) {
      const entry = criteresAgg.get(critere) ?? { sum: 0, count: 0 };
      entry.sum += score;
      entry.count += 1;
      criteresAgg.set(critere, entry);
    }
  }
  const radarData = Array.from(criteresAgg.entries()).map(([critere, { sum, count }]) => ({
    critere: critere.replace(/_/g, " "),
    score: Number((sum / count).toFixed(1)),
  }));

  const streak = computeCurrentStreak((sessions ?? []).map((s) => s.date!));

  return (
    <>
    <AppNav />
    <main className="p-6 mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Votre progression</h1>
        <div className="font-mono-util text-lg text-laiton">🔥 {streak}j</div>
      </div>

      <Card>
        <h2 className="font-display text-lg mb-3">Évolution du score global</h2>
        {lineData.length > 0 ? (
          <ProgressLineChart data={lineData} />
        ) : (
          <p className="text-sm text-foreground/60">Pas encore assez de sessions pour tracer une courbe.</p>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-lg mb-3">Radar de compétences</h2>
        {radarData.length > 0 ? (
          <CompetenceRadar data={radarData} />
        ) : (
          <p className="text-sm text-foreground/60">Pas encore de données de compétences.</p>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-lg mb-3">Historique des sessions</h2>
        <ul className="divide-y divide-border-subtle text-sm">
          {(sessions ?? [])
            .slice()
            .reverse()
            .map((s) => {
              const fb = feedbackBySession.get(s.id);
              return (
                <li key={s.id} className="py-2 flex items-center justify-between">
                  <span>
                    {new Date(s.date!).toLocaleDateString("fr-FR")} —{" "}
                    {(s.scenario_id && scenarioTitleById.get(s.scenario_id)) ?? s.type}
                  </span>
                  <div className="flex items-center gap-3">
                    {fb && <span className="font-mono-util">{fb.score_global.toFixed(1)}</span>}
                    {s.scenario_id && (
                      <Link href={`/conversation/${s.scenario_id}`} className="underline text-laiton">
                        Revanche
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
        </ul>
      </Card>

      <Card>
        <h2 className="font-display text-lg mb-3">Vocabulaire à réviser</h2>
        <div className="flex flex-wrap gap-2">
          {(vocabulaire ?? []).map((v) => (
            <span
              key={v.id}
              className={`rounded-full border px-3 py-1 text-sm ${
                v.reutilise ? "border-laiton text-laiton" : "border-border-subtle"
              }`}
            >
              {v.mot} {v.reutilise ? "✓" : ""}
            </span>
          ))}
          {(!vocabulaire || vocabulaire.length === 0) && (
            <p className="text-sm text-foreground/60">Aucun mot suggéré pour l&apos;instant.</p>
          )}
        </div>
      </Card>
    </main>
    </>
  );
}
