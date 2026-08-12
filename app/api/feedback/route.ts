import { NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, parseJsonResponse } from "@/lib/anthropic";
import { buildFeedbackPrompt } from "@/lib/prompts/feedback";
import type { FeedbackResult } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json();
  const {
    nom_scenario,
    criteres_evalues,
    niveau_difficulte,
    transcription,
    duree,
    niveau_utilisateur,
  } = body as {
    nom_scenario: string;
    criteres_evalues: string[];
    niveau_difficulte: 1 | 2 | 3;
    transcription: string;
    duree: string;
    niveau_utilisateur: string;
  };

  if (!transcription || !transcription.trim()) {
    return NextResponse.json({ error: "Transcription vide — rien à analyser." }, { status: 400 });
  }

  const systemPrompt = buildFeedbackPrompt({
    nom_scenario,
    criteres_evalues,
    niveau_difficulte,
    transcription,
    duree,
    niveau_utilisateur,
  });

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: "Analyse cette prise de parole selon les instructions ci-dessus." }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Réponse IA vide");
    }

    const feedback = parseJsonResponse<FeedbackResult>(textBlock.text);
    return NextResponse.json({ feedback });
  } catch {
    return NextResponse.json(
      { error: "Échec de l'analyse IA. Réessayez dans quelques instants." },
      { status: 502 }
    );
  }
}
