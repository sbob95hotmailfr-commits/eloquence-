import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/Card";

export default async function ConversationListPage() {
  const supabase = await createClient();
  const { data: scenarios } = await supabase
    .from("scenarios")
    .select("id, titre, role_ia, sujet, theme_id")
    .order("titre");

  return (
    <>
    <AppNav />
    <main className="p-6 mx-auto max-w-3xl">
      <h1 className="font-display text-2xl mb-6">Conversation & rôle-play</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {scenarios?.map((s) => (
          <Link key={s.id} href={`/conversation/${s.id}`}>
            <Card className="h-full hover:border-laiton transition-colors">
              <h2 className="font-display text-lg">{s.titre}</h2>
              <p className="text-sm text-foreground/70 mt-1">{s.sujet}</p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
    </>
  );
}
