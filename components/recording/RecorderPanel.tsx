"use client";

import { useEffect } from "react";
import { useRecorder } from "@/lib/audio/useRecorder";
import { Button } from "@/components/ui/Button";
import { PauseMark } from "@/components/ui/PauseMark";

export function RecorderPanel({
  silenceThresholdMs = 2500,
  mode = "auto",
  onDone,
}: {
  silenceThresholdMs?: number;
  mode?: "auto" | "manual";
  onDone: (blob: Blob, durationSeconds: number, pauses: { atSecond: number; durationSeconds: number }[]) => void;
}) {
  const recorder = useRecorder({
    mode,
    silenceThresholdMs,
    graceMs: 700,
    onAutoStop: () => {},
  });

  const handleFinish = () => {
    recorder.stop();
  };

  useEffect(() => {
    if (recorder.audioBlob) {
      onDone(recorder.audioBlob, recorder.elapsedSeconds, recorder.pauses);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.audioBlob]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface p-6">
      {recorder.error && <p className="text-sm text-rouge-correcteur">{recorder.error}</p>}

      <div className="font-mono-util text-3xl">{recorder.elapsedSeconds.toFixed(1)}s</div>

      <div className="flex items-center gap-2 h-6">
        {recorder.isRecording && (
          <>
            <span
              className="h-3 w-3 rounded-full bg-rouge-correcteur animate-pulse"
              aria-hidden
            />
            {recorder.silenceDurationMs > 400 && (
              <PauseMark durationSeconds={recorder.silenceDurationMs / 1000} />
            )}
          </>
        )}
      </div>

      {!recorder.isRecording ? (
        <Button onClick={recorder.start}>Démarrer l&apos;enregistrement</Button>
      ) : (
        <Button variant="secondary" onClick={handleFinish}>
          {mode === "manual" ? "Terminer (relâcher pour envoyer)" : "Terminer maintenant"}
        </Button>
      )}

      <p className="text-xs text-foreground/60 text-center max-w-xs">
        {mode === "auto"
          ? "L'enregistrement s'arrête automatiquement après un silence prolongé — vos pauses de réflexion sont respectées."
          : "Mode manuel : cliquez sur Terminer quand vous avez fini de parler."}
      </p>
    </div>
  );
}
