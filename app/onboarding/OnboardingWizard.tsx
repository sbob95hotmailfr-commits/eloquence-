"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RecorderPanel } from "@/components/recording/RecorderPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PauseMarkLoader } from "@/components/ui/PauseMark";
import type { FeedbackPointCite } from "@/types/domain";

type Theme = { id: string; titre: string; description: string | null };

interface DiagnosticPart {
  label: string;
  instruction: string;
}

const DIAGNOSTIC_PARTS: DiagnosticPart[] = [
  {
    label: "Lecture",
    instruction:
      "Lisez à voix haute : « La clarté d'une idée ne dépend pas de sa complexité, mais de la précision des mots choisis pour la porter. »",
  },
  {
    label: "Réponse improvisée",
    instruction: "Parlez librement pendant environ une minute d'un sujet qui vous tient à cœur.",
  },
  {
    label: "Réaction à une situation",
    instruction:
      "Un collègue conteste publiquement une de vos décisions en réunion. Réagissez à voix haute comme vous le feriez réellement.",
  },
];

type Phase = "diagnostic" | "analyzing" | "interests" | "preferences" | "programme" | "done";

export function OnboardingWizard({ themes }: { themes: Theme[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [phase, setPhase] = useState<Phase>("diagnostic");
  const [partIndex, setPartIndex] = useState(0);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [calibratedThresholdMs, setCalibratedThresholdMs] = useState(2500);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [diagnosticResult, setDiagnosticResult] = useState<{
    scores: Record<string, number>;
    pointsForts: FeedbackPointCite[];
    pointsFaibles: FeedbackPointCite[];
  } | null>(null);

  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);

  const [styleConflit, setStyleConflit] = useState("diplomate");
  const [preferenceEcritOral, setPreferenceEcritOral] = useState("oral");
  const [styleNaturel, setStyleNaturel] = useState("direct");
  const [objectifHebdo, setObjectifHebdo] = useState("3 sessions par semaine");

  const [programme, setProgramme] = useState<{
    justification: string;
    sessions_suggerees: Array<{ jour: string; type: string; titre: string; objectif: string }>;
  } | null>(null);

  async function handlePartRecorded(
    blob: Blob,
    durationSeconds: number,
    pauses: { atSecond: number; durationSeconds: number }[]
  ) {
    setTotalDuration((d) => d + durationSeconds);

    // Calibration VAD : sur l'échantillon de parole libre (improvisation),
    // on mesure le rythme naturel de pauses pour ajuster le seuil de silence.
    if (partIndex === 1 && pauses.length > 0) {
      const avgPause = pauses.reduce((sum, p) => sum + p.durationSeconds, 0) / pauses.length;
      const calibrated = Math.min(3000, Math.max(2000, Math.round((avgPause * 1000 + 500) / 100) * 100));
      setCalibratedThresholdMs(calibrated);
    }

    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de la transcription");

      const label = DIAGNOSTIC_PARTS[partIndex].label;
      setTranscripts((prev) => [...prev, `[${label}] ${data.transcription}`]);

      if (partIndex < DIAGNOSTIC_PARTS.length - 1) {
        setPartIndex((i) => i + 1);
      } else {
        setPhase("analyzing");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur de transcription.");
    }
  }

  async function runDiagnosticAnalysis(combinedTranscript: string) {
    try {
      const res = await fetch("/api/onboarding/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription: combinedTranscript, duree: `${Math.round(totalDuration)}s` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de l'analyse.");

      setDiagnosticResult({
        scores: data.result.scores_par_critere,
        pointsForts: data.result.points_forts,
        pointsFaibles: data.result.points_faibles,
      });
      setPhase("interests");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur d'analyse.");
    }
  }

  // Lance l'analyse dès que la phase passe à "analyzing" (appel réseau asynchrone,
  // le setState réel n'intervient qu'après résolution de la promesse).
  useEffect(() => {
    if (phase === "analyzing" && transcripts.length === DIAGNOSTIC_PARTS.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      runDiagnosticAnalysis(transcripts.join("\n\n"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function saveInterestsAndContinue() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (selectedThemes.length > 0) {
      await supabase
        .from("user_theme_preferences")
        .insert(selectedThemes.map((theme_id) => ({ user_id: user.id, theme_id })));
    }
    setPhase("preferences");
  }

  async function savePreferencesAndGenerate() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("user_profiles")
      .update({
        style_conflit: styleConflit,
        preference_ecrit_oral: preferenceEcritOral,
        style_naturel: styleNaturel,
        objectif_hebdo: objectifHebdo,
        vad_silence_seuil_ms: calibratedThresholdMs,
      })
      .eq("user_id", user.id);

    setPhase("programme");

    try {
      const res = await fetch("/api/onboarding/programme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pointsFaibles: diagnosticResult?.pointsFaibles ?? [],
          pointsForts: diagnosticResult?.pointsForts ?? [],
          themes: selectedThemes,
          styleConflit,
          preferenceEcritOral,
          styleNaturel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de la génération du programme.");
      setProgramme(data.programme);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur de génération du programme.");
    }
  }

  if (errorMsg) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <p className="text-rouge-correcteur mb-4">{errorMsg}</p>
        <Button onClick={() => setErrorMsg(null)}>Continuer</Button>
      </Card>
    );
  }

  if (phase === "diagnostic") {
    const part = DIAGNOSTIC_PARTS[partIndex];
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="text-sm font-mono-util text-foreground/60">
          Étape 1/4 — Diagnostic ({partIndex + 1}/{DIAGNOSTIC_PARTS.length})
        </p>
        <Card>
          <h2 className="font-display text-lg mb-2">{part.label}</h2>
          <p className="text-foreground/80">{part.instruction}</p>
        </Card>
        <RecorderPanel
          key={partIndex}
          mode={part.label === "Lecture" ? "manual" : "auto"}
          silenceThresholdMs={2500}
          onDone={handlePartRecorded}
        />
      </div>
    );
  }

  if (phase === "analyzing") {
    return <PauseMarkLoader label="Analyse de votre diagnostic en cours…" />;
  }

  if (phase === "interests") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="text-sm font-mono-util text-foreground/60">Étape 2/4 — Vos centres d&apos;intérêt</p>
        {diagnosticResult && (
          <Card>
            <h2 className="font-display text-lg mb-2">Résultat du diagnostic</h2>
            <div className="flex flex-wrap gap-4 mb-3">
              {Object.entries(diagnosticResult.scores).map(([k, v]) => (
                <span key={k} className="font-mono-util text-sm">
                  {k.replace(/_/g, " ")} : {v.toFixed(1)}
                </span>
              ))}
            </div>
          </Card>
        )}
        <Card>
          <h2 className="font-display text-lg mb-3">Choisissez les thèmes à travailler</h2>
          <div className="flex flex-wrap gap-2">
            {themes.map((theme) => {
              const active = selectedThemes.includes(theme.id);
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() =>
                    setSelectedThemes((prev) =>
                      active ? prev.filter((id) => id !== theme.id) : [...prev, theme.id]
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    active ? "bg-laiton text-encre border-laiton" : "border-border-subtle"
                  }`}
                >
                  {theme.titre}
                </button>
              );
            })}
          </div>
        </Card>
        <Button onClick={saveInterestsAndContinue} disabled={selectedThemes.length === 0}>
          Continuer
        </Button>
      </div>
    );
  }

  if (phase === "preferences") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="text-sm font-mono-util text-foreground/60">Étape 3/4 — Vos préférences d&apos;entraînement</p>
        <Card className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Face à un désaccord, vous êtes plutôt…</span>
            <select
              value={styleConflit}
              onChange={(e) => setStyleConflit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
            >
              <option value="diplomate">Diplomate — vous cherchez le compromis</option>
              <option value="direct">Direct — vous allez droit au but</option>
              <option value="evitant">Évitant — vous préférez temporiser</option>
              <option value="affirme">Affirmé — vous défendez fermement votre position</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Vous êtes plus à l&apos;aise…</span>
            <select
              value={preferenceEcritOral}
              onChange={(e) => setPreferenceEcritOral(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
            >
              <option value="oral">À l&apos;oral</option>
              <option value="ecrit">À l&apos;écrit</option>
              <option value="les_deux">Les deux</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Votre style naturel</span>
            <select
              value={styleNaturel}
              onChange={(e) => setStyleNaturel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
            >
              <option value="direct">Direct et concis</option>
              <option value="narratif">Narratif — vous aimez raconter</option>
              <option value="analytique">Analytique et structuré</option>
              <option value="chaleureux">Chaleureux et spontané</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Objectif hebdomadaire</span>
            <input
              value={objectifHebdo}
              onChange={(e) => setObjectifHebdo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>
        </Card>
        <Button onClick={savePreferencesAndGenerate}>Générer mon programme</Button>
      </div>
    );
  }

  if (phase === "programme") {
    return <PauseMarkLoader label="Génération de votre programme des 2 premières semaines…" />;
  }

  if (phase === "done" && programme) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="text-sm font-mono-util text-foreground/60">Étape 4/4 — Votre programme</p>
        <Card>
          <h2 className="font-display text-lg mb-2">Pourquoi ce programme ?</h2>
          <p className="text-foreground/80 text-sm">{programme.justification}</p>
        </Card>
        <Card>
          <h2 className="font-display text-lg mb-3">Sessions suggérées</h2>
          <ul className="space-y-2 text-sm">
            {programme.sessions_suggerees.map((s, i) => (
              <li key={i} className="border-l-2 border-laiton pl-3">
                <span className="font-mono-util">{s.jour}</span> — <strong>{s.titre}</strong> ({s.type})
                <p className="text-foreground/60">{s.objectif}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Button onClick={() => router.push("/dashboard")} className="w-full">
          Accéder à mon tableau de bord
        </Button>
      </div>
    );
  }

  return null;
}
