"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RecorderPanel } from "@/components/recording/RecorderPanel";
import { SelfAssessment } from "@/components/feedback/SelfAssessment";
import { FeedbackReport } from "@/components/feedback/FeedbackReport";
import { PauseMarkLoader } from "@/components/ui/PauseMark";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LECTURE_PASSAGES, IMPROVISATION_TOPICS, randomFrom } from "@/lib/practicePrompts";
import { saveSuggestedVocabulary, markVocabularyReused } from "@/lib/vocabulaire";
import type { FeedbackResult } from "@/types/domain";
import type { Json } from "@/types/database";

type Step = "prompt" | "processing" | "self-assessment" | "analyzing" | "result" | "error";

const CRITERES_LIBRES = ["clarte", "fluidite", "structure_argumentaire", "confiance"];

export function PracticeSession({ type, silenceThresholdMs }: { type: "lecture" | "improvisation"; silenceThresholdMs: number }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const prompt = useMemo(
    () => (type === "lecture" ? randomFrom(LECTURE_PASSAGES) : randomFrom(IMPROVISATION_TOPICS)),
    [type]
  );

  const [step, setStep] = useState<Step>("prompt");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcription, setTranscription] = useState("");
  const [duration, setDuration] = useState(0);
  const [pauses, setPauses] = useState<{ atSecond: number; durationSeconds: number }[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [autoEval, setAutoEval] = useState<number | undefined>(undefined);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);

  async function handleRecorded(blob: Blob, durationSeconds: number, pauseMarkers: typeof pauses) {
    setStep("processing");
    setDuration(durationSeconds);
    setPauses(pauseMarkers);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const path = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from("recordings").upload(path, blob);
      if (uploadError) throw uploadError;

      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const transcribeRes = await fetch("/api/transcribe", { method: "POST", body: form });
      const transcribeData = await transcribeRes.json();
      if (!transcribeRes.ok) throw new Error(transcribeData.error ?? "Échec de la transcription");

      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          type,
          audio_url: path,
          transcription: transcribeData.transcription,
          duree_secondes: Math.round(durationSeconds),
        })
        .select("id")
        .single();
      if (sessionError) throw sessionError;

      setTranscription(transcribeData.transcription);
      setSessionId(session.id);
      setStep("self-assessment");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStep("error");
    }
  }

  async function handleSelfAssessment(score: number) {
    setAutoEval(score);
    setStep("analyzing");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom_scenario: type === "lecture" ? "Lecture à voix haute" : "Improvisation libre",
          criteres_evalues: CRITERES_LIBRES,
          niveau_difficulte: 1,
          transcription,
          duree: `${Math.round(duration)}s`,
          niveau_utilisateur: "en progression",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de l'analyse");

      const result: FeedbackResult = data.feedback;
      setFeedback(result);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (sessionId) {
        await supabase.from("feedback").insert({
          session_id: sessionId,
          score_global: result.score_global,
          scores_par_critere: result.scores_par_critere,
          points_forts: result.points_forts as unknown as Json,
          points_faibles: result.points_faibles as unknown as Json,
          conseils_actionnables: result.conseils_actionnables,
          corrections: result.corrections as unknown as Json,
          auto_evaluation_utilisateur: score,
        });
      }

      if (user) {
        await markVocabularyReused(supabase, user.id, transcription);
        await saveSuggestedVocabulary(supabase, user.id, result);
      }

      setStep("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStep("error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {step === "prompt" && (
        <>
          <Card>
            <h2 className="font-display text-lg mb-2">
              {type === "lecture" ? "Texte à lire" : "Improvisation"}
            </h2>
            <p className="text-foreground/80">{prompt}</p>
          </Card>
          <RecorderPanel silenceThresholdMs={silenceThresholdMs} onDone={handleRecorded} />
        </>
      )}

      {step === "processing" && <PauseMarkLoader label="Transcription en cours…" />}
      {step === "analyzing" && <PauseMarkLoader label="Analyse du coach IA en cours…" />}

      {step === "self-assessment" && <SelfAssessment onSubmit={handleSelfAssessment} />}

      {step === "result" && feedback && (
        <FeedbackReport feedback={feedback} transcription={transcription} autoEvaluation={autoEval} pauses={pauses} />
      )}

      {step === "error" && (
        <Card className="text-center">
          <p className="text-rouge-correcteur mb-4">{errorMsg}</p>
          <Button onClick={() => setStep("prompt")}>Réessayer</Button>
        </Card>
      )}

      {step === "result" && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => router.push("/dashboard")}>
            Retour au tableau de bord
          </Button>
        </div>
      )}
    </div>
  );
}
