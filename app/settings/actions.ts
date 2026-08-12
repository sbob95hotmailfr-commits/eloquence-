"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateObjectifHebdo(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const objectif_hebdo = String(formData.get("objectif_hebdo") ?? "");
  const heure_pratique_habituelle = String(formData.get("heure_pratique_habituelle") ?? "") || null;

  await supabase
    .from("user_profiles")
    .update({ objectif_hebdo, heure_pratique_habituelle })
    .eq("user_id", user.id);

  revalidatePath("/settings");
}

export async function deleteAllRecordings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, audio_url")
    .eq("user_id", user.id)
    .not("audio_url", "is", null);

  const paths = (sessions ?? []).map((s) => s.audio_url).filter((p): p is string => !!p);
  if (paths.length > 0) {
    await supabase.storage.from("recordings").remove(paths);
  }

  const ids = (sessions ?? []).map((s) => s.id);
  if (ids.length > 0) {
    await supabase.from("sessions").update({ audio_url: null }).in("id", ids);
  }

  revalidatePath("/settings");
}
