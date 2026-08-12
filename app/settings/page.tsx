import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/app/login/actions";
import { updateObjectifHebdo, deleteAllRecordings } from "./actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <main className="p-6">Connectez-vous pour accéder aux paramètres.</main>;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("objectif_hebdo, heure_pratique_habituelle, vad_silence_seuil_ms")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("date")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(30);

  const hourCounts = new Map<number, number>();
  for (const s of recentSessions ?? []) {
    const hour = new Date(s.date!).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  const suggestedHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <>
    <AppNav />
    <main className="p-6 mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl">Paramètres</h1>

      <Card>
        <h2 className="font-display text-lg mb-3">Objectif & rappels</h2>
        <form action={updateObjectifHebdo} className="space-y-3">
          <label className="block text-sm">
            Objectif hebdomadaire
            <input
              name="objectif_hebdo"
              defaultValue={profile?.objectif_hebdo ?? ""}
              className="mt-1 w-full rounded-lg border border-border-subtle bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Heure de pratique habituelle
            {suggestedHour !== undefined && !profile?.heure_pratique_habituelle && (
              <span className="block text-xs text-foreground/60">
                Suggestion apprise de vos habitudes : {suggestedHour}h
              </span>
            )}
            <input
              type="time"
              name="heure_pratique_habituelle"
              defaultValue={profile?.heure_pratique_habituelle ?? (suggestedHour !== undefined ? `${String(suggestedHour).padStart(2, "0")}:00` : "")}
              className="mt-1 w-full rounded-lg border border-border-subtle bg-background px-3 py-2"
            />
          </label>
          <Button type="submit">Enregistrer</Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-lg mb-2">Calibration voix</h2>
        <p className="text-sm text-foreground/70">
          Seuil de silence actuel : {((profile?.vad_silence_seuil_ms ?? 2500) / 1000).toFixed(1)}s. Recalibré
          automatiquement à chaque réévaluation du diagnostic.
        </p>
      </Card>

      <Card>
        <h2 className="font-display text-lg mb-2">Réévaluation</h2>
        <p className="text-sm text-foreground/70 mb-3">
          Vous pouvez repasser le diagnostic initial à tout moment pour ajuster votre programme.
        </p>
        <Link href="/onboarding">
          <Button variant="secondary">Repasser le diagnostic</Button>
        </Link>
      </Card>

      <Card>
        <h2 className="font-display text-lg mb-2">Confidentialité</h2>
        <p className="text-sm text-foreground/70 mb-3">
          Supprime tous vos enregistrements audio stockés. Vos transcriptions et feedbacks restent conservés.
        </p>
        <form action={deleteAllRecordings}>
          <Button type="submit" variant="danger">
            Supprimer tous mes enregistrements
          </Button>
        </form>
      </Card>

      <form action={signOut}>
        <Button type="submit" variant="ghost">
          Se déconnecter
        </Button>
      </form>
    </main>
    </>
  );
}
