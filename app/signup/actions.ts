"use server";

import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "@/app/login/actions";

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Le profil utilisateur est créé au premier callback authentifié (voir
  // app/auth/callback/route.ts) car la session n'existe pas encore tant que
  // l'email n'est pas confirmé.
  return { success: true };
}
