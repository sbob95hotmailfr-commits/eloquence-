import { NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, parseJsonResponse } from "@/lib/anthropic";
import { buildFeedbackPrompt } from "@/lib/prompts/feedback";
import type { FeedbackResult } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const CRITERES_DIAGNOSTIC = ["clarte", "structure_argumentaire", "confiance", "fluidite", "gestion_du_stress"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { transcription, duree } = (await request.json()) as { transcription: string; duree: string };
  if (!transcription?.trim()) {
    return NextResponse.json({ error: "Transcription vide." }, { status: 400 });
  }

  const systemPrompt = buildFeedbackPrompt({
    nom_scenario: "Diagnostic initial (lecture, improvisation, réaction à une situation)",
    criteres_evalues: CRITERES_DIAGNOSTIC,
    niveau_difficulte: 1,
    transcription,
    duree,
    niveau_utilisateur: "non évalué — premier passage",
  });

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: "Analyse ce test diagnostique selon les instructions ci-dessus." }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("Réponse IA vide");
    const result = parseJsonResponse<FeedbackResult>(textBlock.text);

    const { data: diagnostic, error } = await supabase
      .from("diagnostic_tests")
      .insert({
        user_id: user.id,
        scores_initiaux: result.scores_par_critere as unknown as Json,
        points_forts: result.points_forts as unknown as Json,
        points_faibles: result.points_faibles as unknown as Json,
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ result, diagnosticId: diagnostic.id });
  } catch {
    return NextResponse.json({ error: "Échec de l'analyse du diagnostic." }, { status: 502 });
  }
}
