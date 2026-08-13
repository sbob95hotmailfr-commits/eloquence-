import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWebPush } from "@/lib/push/webpush";

export const runtime = "nodejs";

/**
 * Déclenché toutes les heures par le cron Vercel (voir vercel.json).
 * Simplification assumée : l'heure de pratique est comparée directement à
 * l'heure UTC courante, sans fuseau horaire par utilisateur — suffisant pour
 * un usage personnel, à revoir si l'app accueille des utilisateurs répartis
 * sur plusieurs fuseaux.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const webpush = getWebPush();

  const now = new Date();
  const currentHour = String(now.getUTCHours()).padStart(2, "0");

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, heure_pratique_habituelle")
    .eq("notifications_activees", true)
    .not("heure_pratique_habituelle", "is", null);

  const dueUsers = (profiles ?? []).filter((p) =>
    p.heure_pratique_habituelle?.startsWith(currentHour)
  );

  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  let sent = 0;

  for (const profile of dueUsers) {
    const { data: todaySessions } = await supabase
      .from("sessions")
      .select("id")
      .eq("user_id", profile.user_id)
      .gte("date", startOfDay.toISOString())
      .limit(1);

    if (todaySessions && todaySessions.length > 0) continue;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", profile.user_id);

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: "Éloquence",
            body: "C'est l'heure habituelle de votre entraînement — quelques minutes suffisent.",
            url: "/dashboard",
          })
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
  }

  return NextResponse.json({ checked: dueUsers.length, sent });
}
