import { NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, parseJsonResponse } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

interface ProgrammeResult {
  justification: string;
  sessions_suggerees: Array<{ jour: string; type: string; titre: string; objectif: string }>;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { pointsFaibles, pointsForts, themes, styleConflit, preferenceEcritOral, styleNaturel } =
    await request.json();

  const systemPrompt = `RÔLE
Tu es le même coach expert en éloquence, rigoureux et honnête, qui vient d'analyser
le test diagnostique de l'utilisateur.

OBJECTIF
Construire un programme d'entraînement pour les 2 premières semaines, réparti en
sessions courtes et régulières, adapté aux points faibles identifiés et aux
thèmes choisis par l'utilisateur.

CONTEXTE
- Points forts identifiés : ${JSON.stringify(pointsForts)}
- Points faibles identifiés : ${JSON.stringify(pointsFaibles)}
- Thèmes choisis : ${JSON.stringify(themes)}
- Style face au désaccord : ${styleConflit}
- Préférence écrit/oral : ${preferenceEcritOral}
- Style naturel : ${styleNaturel}

RÈGLES
1. Priorise les points faibles sans négliger un minimum de pratique sur les points forts.
2. Propose entre 3 et 5 sessions par semaine, réalistes (10-15 minutes chacune).
3. Justifie le programme en expliquant le lien entre les exercices et le diagnostic.
4. Réponds uniquement en français.

FORMAT
Réponds UNIQUEMENT avec un objet JSON valide :
{
  "justification": "...",
  "sessions_suggerees": [{ "jour": "...", "type": "lecture|improvisation|conversation", "titre": "...", "objectif": "..." }]
}`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: "Génère le programme des 2 premières semaines." }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("Réponse IA vide");
    const result = parseJsonResponse<ProgrammeResult>(textBlock.text);

    await supabase.from("programmes_personnalises").insert([
      { user_id: user.id, semaine: 1, sessions_suggerees: result.sessions_suggerees, justification: result.justification },
      { user_id: user.id, semaine: 2, sessions_suggerees: result.sessions_suggerees, justification: result.justification },
    ]);

    return NextResponse.json({ programme: result });
  } catch {
    return NextResponse.json({ error: "Échec de la génération du programme." }, { status: 502 });
  }
}
