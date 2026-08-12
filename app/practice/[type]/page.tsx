import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PracticeSession } from "./PracticeSession";

export default async function PracticeTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (type !== "lecture" && type !== "improvisation") notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let silenceThresholdMs = 2500;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("vad_silence_seuil_ms")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile?.vad_silence_seuil_ms) silenceThresholdMs = profile.vad_silence_seuil_ms;
  }

  return (
    <main className="p-6">
      <PracticeSession type={type} silenceThresholdMs={silenceThresholdMs} />
    </main>
  );
}
