import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: themes } = await supabase.from("themes").select("id, titre, description");

  return (
    <main className="p-6">
      <h1 className="font-display text-2xl text-center mb-8">Bienvenue sur Éloquence</h1>
      <OnboardingWizard themes={themes ?? []} />
    </main>
  );
}
