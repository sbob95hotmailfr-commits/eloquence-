"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useVoiceActivity } from "@/lib/audio/useVoiceActivity";
import { useSpeechSynthesis } from "@/lib/audio/useSpeechSynthesis";
import { useAmbientNoise } from "@/lib/audio/useAmbientNoise";
import { updateScenarioProgress } from "@/lib/progression";
import { saveSuggestedVocabulary, markVocabularyReused } from "@/lib/vocabulaire";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PauseMark, PauseMarkLoader } from "@/components/ui/PauseMark";
import { SelfAssessment } from "@/components/feedback/SelfAssessment";
import { FeedbackReport } from "@/components/feedback/FeedbackReport";
import type { ConversationMessage, FeedbackResult, NiveauDifficulte } from "@/types/domain";
import type { Json } from "@/types/database";

type Scenario = {
  id: string;
  titre: string;
  role_ia: string;
  sujet: string;
  criteres_evalues: string[];
};

type Phase = "setup" | "listening" | "transcribing" | "ai-thinking" | "ai-speaking" | "ending" | "self-assessment" | "feedback" | "error";

export function ConversationRoom({
  scenario,
  niveauDepart,
  silenceThresholdMs,
}: {
  scenario: Scenario;
  niveauDepart: NiveauDifficulte;
  silenceThresholdMs: number;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("setup");
  const [niveau, setNiveau] = useState<NiveauDifficulte>(niveauDepart);
  const [inputMode, setInputMode] = useState<"auto" | "manual">("auto");
  const [semiDuplex, setSemiDuplex] = useState(false);
  const [publicSimulation, setPublicSimulation] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [autoEval, setAutoEval] = useState<number | undefined>(undefined);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [sessionStart] = useState(() => Date.now());

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const phaseRef = useRef<Phase>(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const { speak, interrupt, isSpeaking } = useSpeechSynthesis();
  useAmbientNoise(publicSimulation);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const stopListeningAndSend = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  // VAD unique, réutilisé pour deux usages distincts selon la phase :
  // - "listening" : détecter la fin du tour utilisateur (silence 2-3s + grâce)
  // - "ai-speaking" : détecter une interruption volontaire (voix continue 300-500ms)
  useVoiceActivity(stream, {
    silenceThresholdMs,
    graceMs: 700,
    speechConfirmMs: 400,
    onSilenceConfirmed: () => {
      if (phaseRef.current === "listening" && inputMode === "auto") {
        stopListeningAndSend();
      }
    },
    onSpeechConfirmed: () => {
      if (phaseRef.current === "ai-speaking" && !semiDuplex) {
        interrupt();
        startListening();
      }
    },
  });

  async function ensureStream() {
    if (stream) return stream;
    const s = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    setStream(s);
    return s;
  }

  async function startListening() {
    try {
      const s = await ensureStream();
      chunksRef.current = [];
      const recorder = new MediaRecorder(s);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await handleUserTurn(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setPhase("listening");
    } catch {
      setErrorMsg("Micro non autorisé. Vérifiez les permissions de votre navigateur.");
      setPhase("error");
    }
  }

  async function handleUserTurn(blob: Blob) {
    setPhase("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de la transcription");

      if (!data.transcription?.trim()) {
        // Rien de détecté (silence pur) — on relance l'écoute sans tour vide.
        startListening();
        return;
      }

      const updated: ConversationMessage[] = [...messages, { role: "user", content: data.transcription }];
      setMessages(updated);
      await requestAiReply(updated);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur pendant votre tour de parole.");
      setPhase("error");
    }
  }

  async function requestAiReply(history: ConversationMessage[]) {
    setPhase("ai-thinking");
    try {
      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_ia: scenario.role_ia,
          nom_scenario: scenario.titre,
          sujet: scenario.sujet,
          niveau_difficulte: niveau,
          criteres_evalues: scenario.criteres_evalues,
          messages: history,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de la réponse IA.");

      const updated: ConversationMessage[] = [...history, { role: "assistant", content: data.reply }];
      setMessages(updated);
      setPhase("ai-speaking");
      speak(data.reply, () => {
        if (phaseRef.current === "ai-speaking") startListening();
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur pendant la réponse IA.");
      setPhase("error");
    }
  }

  async function endSession() {
    setPhase("ending");
    interrupt();
    try {
      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_ia: scenario.role_ia,
          nom_scenario: scenario.titre,
          sujet: scenario.sujet,
          niveau_difficulte: niveau,
          criteres_evalues: scenario.criteres_evalues,
          messages,
          endSession: true,
          duree: `${Math.round((Date.now() - sessionStart) / 1000)}s`,
          niveau_utilisateur: `niveau ${niveau}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec du feedback de fin de session.");
      setFeedback(data.feedback);
      setPhase("self-assessment");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur pendant la génération du feedback.");
      setPhase("error");
    }
  }

  async function handleSelfAssessment(score: number) {
    setAutoEval(score);
    setPhase("feedback");
    if (!feedback) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: session } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        scenario_id: scenario.id,
        type: "conversation",
        transcription: messages.map((m) => `${m.role}: ${m.content}`).join("\n"),
        messages: messages as unknown as Json,
        duree_secondes: Math.round((Date.now() - sessionStart) / 1000),
      })
      .select("id")
      .single();

    if (session) {
      await supabase.from("feedback").insert({
        session_id: session.id,
        score_global: feedback.score_global,
        scores_par_critere: feedback.scores_par_critere as unknown as Json,
        points_forts: feedback.points_forts as unknown as Json,
        points_faibles: feedback.points_faibles as unknown as Json,
        conseils_actionnables: feedback.conseils_actionnables as unknown as Json,
        corrections: feedback.corrections as unknown as Json,
        auto_evaluation_utilisateur: score,
      });
    }

    await updateScenarioProgress(supabase, user.id, scenario.id, feedback.score_global);
    const fullTranscript = messages.filter((m) => m.role === "user").map((m) => m.content).join(" ");
    await markVocabularyReused(supabase, user.id, fullTranscript);
    await saveSuggestedVocabulary(supabase, user.id, feedback);
  }

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Card>
          <h1 className="font-display text-2xl mb-2">{scenario.titre}</h1>
          <p className="text-foreground/70 text-sm mb-4">
            Face à vous : {scenario.role_ia}. Situation : {scenario.sujet}
          </p>
          <div className="space-y-3">
            <label className="block text-sm">
              Difficulté
              <select
                value={niveau}
                onChange={(e) => setNiveau(Number(e.target.value) as NiveauDifficulte)}
                className="mt-1 w-full rounded-lg border border-border-subtle bg-background px-3 py-2"
              >
                <option value={1}>1 — Bienveillant</option>
                <option value={2}>2 — Neutre et exigeant</option>
                <option value={3}>3 — Challenge actif</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inputMode === "manual"}
                onChange={(e) => setInputMode(e.target.checked ? "manual" : "auto")}
              />
              Mode manuel (push-to-talk)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={semiDuplex} onChange={(e) => setSemiDuplex(e.target.checked)} />
              Semi-duplex — micro coupé pendant que l&apos;IA parle (zéro interruption)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={publicSimulation}
                onChange={(e) => setPublicSimulation(e.target.checked)}
              />
              Simulation de public (bruit ambiant léger)
            </label>
          </div>
          <Button className="w-full mt-4" onClick={startListening}>
            Commencer
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <Card className="max-w-md mx-auto text-center">
        <p className="text-rouge-correcteur mb-4">{errorMsg}</p>
        <Button onClick={() => router.push("/conversation")}>Retour aux scénarios</Button>
      </Card>
    );
  }

  if (phase === "self-assessment") {
    return <SelfAssessment onSubmit={handleSelfAssessment} />;
  }

  if (phase === "feedback" && feedback) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <FeedbackReport
          feedback={feedback}
          transcription={messages.map((m) => `${m.role === "user" ? "Vous" : scenario.role_ia}: ${m.content}`).join("\n")}
          autoEvaluation={autoEval}
        />
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Mode revanche — rejouer
          </Button>
          <Button onClick={() => router.push("/dashboard")}>Tableau de bord</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <h1 className="font-display text-lg mb-3">{scenario.titre}</h1>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <span
                className={`inline-block rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-laiton/20" : "bg-surface-muted"
                }`}
              >
                {m.content}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-col items-center gap-3">
        {phase === "listening" && (
          <>
            <p className="pause-mark text-xl">
              <PauseMark durationSeconds={1.2} /> À vous de parler…
            </p>
            {inputMode === "manual" && <Button onClick={stopListeningAndSend}>Terminer mon tour</Button>}
          </>
        )}
        {phase === "transcribing" && <PauseMarkLoader label="Transcription…" />}
        {phase === "ai-thinking" && <PauseMarkLoader label={`${scenario.role_ia} réfléchit…`} />}
        {phase === "ai-speaking" && isSpeaking && (
          <p className="text-sm text-foreground/60">{scenario.role_ia} parle — parlez pour l&apos;interrompre.</p>
        )}
        {phase === "ending" && <PauseMarkLoader label="Génération du feedback de fin de session…" />}
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={endSession} disabled={phase === "ending"}>
          Terminer la session
        </Button>
      </div>
    </div>
  );
}
