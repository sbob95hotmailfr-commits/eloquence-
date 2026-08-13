import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Client Supabase privilégié (clé service_role) — contourne les policies RLS.
 * Réservé aux tâches serveur de confiance (ex : cron des rappels), jamais
 * exposé au client. Ne jamais importer ce module depuis un composant client.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
