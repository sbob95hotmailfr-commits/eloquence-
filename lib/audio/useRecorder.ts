"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVoiceActivity } from "./useVoiceActivity";

export interface PauseMarker {
  atSecond: number;
  durationSeconds: number;
}

export interface RecorderOptions {
  /** "auto" s'arrête après le seuil de silence calibré ; "manual" = push-to-talk. */
  mode?: "auto" | "manual";
  silenceThresholdMs?: number;
  graceMs?: number;
  onAutoStop?: () => void;
}

export function useRecorder({ mode = "auto", silenceThresholdMs = 2500, graceMs = 700, onAutoStop }: RecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [pauses, setPauses] = useState<PauseMarker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePauseStartRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setIsRecording(false);
    onAutoStop?.();
  }, [onAutoStop]);

  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const handleSilenceConfirmed = useCallback(() => {
    activePauseStartRef.current = performance.now();
    if (mode === "auto") {
      stopRef.current();
    }
  }, [mode]);

  const handleSpeechConfirmed = useCallback(() => {
    if (activePauseStartRef.current !== null) {
      const durationSeconds = (performance.now() - activePauseStartRef.current) / 1000;
      const atSecond = (performance.now() - startTimeRef.current) / 1000;
      if (durationSeconds >= 1) {
        setPauses((prev) => [...prev, { atSecond, durationSeconds }]);
      }
      activePauseStartRef.current = null;
    }
  }, []);

  const { volume, silenceDurationMs } = useVoiceActivity(stream, {
    silenceThresholdMs,
    graceMs,
    onSilenceConfirmed: handleSilenceConfirmed,
    onSpeechConfirmed: handleSpeechConfirmed,
  });

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setPauses([]);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setStream(newStream);

      const recorder = new MediaRecorder(newStream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        newStream.getTracks().forEach((t) => t.stop());
        setStream(null);
      };

      recorderRef.current = recorder;
      startTimeRef.current = performance.now();
      recorder.start();
      setIsRecording(true);

      tickRef.current = setInterval(() => {
        setElapsedSeconds((performance.now() - startTimeRef.current) / 1000);
      }, 200);
    } catch {
      setError("Micro non autorisé. Vérifiez les permissions de votre navigateur.");
    }
  }, []);

  return {
    start,
    stop,
    isRecording,
    elapsedSeconds,
    audioBlob,
    pauses,
    volume,
    silenceDurationMs,
    error,
    mode,
  };
}
