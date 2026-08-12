import { NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, parseJsonResponse } from "@/lib/anthropic";
import { buildConversationPrompt } from "@/lib/prompts/conversation";
import { buildConversationToFeedbackSwitch } from "@/lib/prompts/feedback";
import type { ConversationMessage, FeedbackResult, NiveauDifficulte } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

interface ConversationRequestBody {
  role_ia: string;
  nom_scenario: string;
  sujet: string;
  niveau_difficulte: NiveauDifficulte;
  criteres_evalues: string[];
  // Historique complet — l'API Claude n'a pas de mémoire entre les appels,
  // c'est l'application qui reconstitue le contexte à chaque requête.
  messages: ConversationMessage[];
  endSession?: boolean;
  duree?: string;
  niveau_utilisateur?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = (await request.json()) as ConversationRequestBody;
  const {
    role_ia,
    nom_scenario,
    sujet,
    niveau_difficulte,
    criteres_evalues,
    messages,
    endSession,
    duree,
    niveau_utilisateur,
  } = body;

  if (endSession) {
    const transcription = messages
      .map((m) => `${m.role === "user" ? "Utilisateur" : "IA"}: ${m.content}`)
      .join("\n");

    const systemPrompt = buildConversationToFeedbackSwitch({
      nom_scenario,
      criteres_evalues,
      niveau_difficulte,
      transcription,
      duree: duree ?? "inconnue",
      niveau_utilisateur: niveau_utilisateur ?? "inconnu",
    });

    try {
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: "FIN_SESSION — produis le feedback au format JSON demandé." }],
      });
      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") throw new Error("Réponse IA vide");
      const feedback = parseJsonResponse<FeedbackResult>(textBlock.text);
      return NextResponse.json({ feedback });
    } catch {
      return NextResponse.json({ error: "Échec de la génération du feedback." }, { status: 502 });
    }
  }

  const systemPrompt = buildConversationPrompt({
    role_ia,
    nom_scenario,
    sujet,
    niveau_difficulte,
    criteres_evalues,
  });

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      // Plafond volontairement bas : le prompt impose des réponses courtes et
      // naturelles à l'oral, et un plafond réduit accélère la génération et
      // la synthèse vocale qui suit — sans streaming, c'est le principal
      // levier de latence disponible.
      max_tokens: 300,
      // Effort bas : répliques de personnage courtes et naturelles, pas de
      // raisonnement complexe à faire — réduit la latence sans dégrader la
      // tâche (contrairement au feedback, où l'effort reste par défaut).
      output_config: { effort: "low" },
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("Réponse IA vide");
    return NextResponse.json({ reply: textBlock.text });
  } catch {
    return NextResponse.json({ error: "Échec de la réponse IA. Réessayez." }, { status: 502 });
  }
}
