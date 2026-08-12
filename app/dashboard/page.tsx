import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/Card";
import { computeCurrentStreak } from "@/lib/streaks";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("pseudo, objectif_hebdo")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: diagnostic } = await supabase
    .from("diagnostic_tests")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!diagnostic) redirect("/onboarding");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, date")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(30);

  const streak = computeCurrentStreak((sessions ?? []).map((s) => s.date!));

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const sessionsThisWeek = (sessions ?? []).filter((s) => new Date(s.date!) >= startOfWeek).length;

  const { data: programme } = await supabase
    .from("programmes_personnalises")
    .select("semaine, sessions_suggerees, justification")
    .eq("user_id", user.id)
    .eq("semaine", 1)
    .maybeSingle();

  return (
    <>
      <AppNav />
      <main className="p-6 mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="font-display text-2xl">
            Bonjour{profile?.pseudo ? `, ${profile.pseudo}` : ""}
          </h1>
          <p className="text-foreground/70 text-sm mt-1">
            🔥 {streak} jour{streak > 1 ? "s" : ""} de suite · {sessionsThisWeek} session
            {sessionsThisWeek > 1 ? "s" : ""} cette semaine
            {profile?.objectif_hebdo ? ` (objectif : ${profile.objectif_hebdo})` : ""}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/practice/lecture">
            <Card className="h-full hover:border-laiton transition-colors">
              <h2 className="font-display text-lg">Lecture</h2>
              <p className="text-sm text-foreground/70 mt-1">Travaillez votre diction sur un texte.</p>
            </Card>
          </Link>
          <Link href="/practice/improvisation">
            <Card className="h-full hover:border-laiton transition-colors">
              <h2 className="font-display text-lg">Improvisation</h2>
              <p className="text-sm text-foreground/70 mt-1">Répondez librement à un sujet donné.</p>
            </Card>
          </Link>
          <Link href="/conversation">
            <Card className="h-full hover:border-laiton transition-colors">
              <h2 className="font-display text-lg">Rôle-play</h2>
              <p className="text-sm text-foreground/70 mt-1">Entraînez-vous face à un personnage IA.</p>
            </Card>
          </Link>
        </div>

        {programme && (
          <Card>
            <h2 className="font-display text-lg mb-2">Programme de la semaine 1</h2>
            <p className="text-sm text-foreground/70 mb-3">{programme.justification}</p>
            <ul className="space-y-1 text-sm">
              {(programme.sessions_suggerees as Array<{ jour: string; titre: string; type: string }>).map(
                (s, i) => (
                  <li key={i}>
                    <span className="font-mono-util">{s.jour}</span> — {s.titre} ({s.type})
                  </li>
                )
              )}
            </ul>
          </Card>
        )}

        <div className="flex justify-end">
          <Link href="/progress" className="text-sm underline text-laiton">
            Voir ma progression complète →
          </Link>
        </div>
      </main>
    </>
  );
}
