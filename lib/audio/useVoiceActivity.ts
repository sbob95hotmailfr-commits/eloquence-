"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Détection d'activité vocale (VAD) au-dessus d'un flux audio existant.
 *
 * Principe directeur : ne jamais agir sur un signal isolé et instantané.
 * On ne considère un silence (ou une reprise de parole) confirmé qu'après
 * une durée continue au-dessus/en dessous du seuil de volume — jamais sur
 * un échantillon unique.
 */
export interface VoiceActivityOptions {
  /** Seuil RMS (0-1) au-dessus duquel on considère qu'il y a de la voix. */
  volumeThreshold?: number;
  /** Durée continue de voix nécessaire pour confirmer une prise de parole (anti bruit isolé). */
  speechConfirmMs?: number;
  /** Durée continue de silence nécessaire pour déclencher une fin de tour. */
  silenceThresholdMs?: number;
  /** Fenêtre de grâce après le seuil de silence, avant de confirmer la fin de tour. */
  graceMs?: number;
  onSilenceConfirmed?: () => void;
  onSpeechConfirmed?: () => void;
}

export function useVoiceActivity(
  stream: MediaStream | null,
  {
    volumeThreshold = 0.02,
    speechConfirmMs = 350,
    silenceThresholdMs = 2500,
    graceMs = 700,
    onSilenceConfirmed,
    onSpeechConfirmed,
  }: VoiceActivityOptions
) {
  const [volume, setVolume] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [silenceDurationMs, setSilenceDurationMs] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const speakingSinceRef = useRef<number | null>(null);
  const silentSinceRef = useRef<number | null>(null);
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceConfirmedRef = useRef(false);

  useEffect(() => {
    if (!stream) return;

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const centered = (data[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      setVolume(rms);

      const now = performance.now();
      const above = rms >= volumeThreshold;

      if (above) {
        silentSinceRef.current = null;
        setSilenceDurationMs(0);
        if (graceTimeoutRef.current) {
          clearTimeout(graceTimeoutRef.current);
          graceTimeoutRef.current = null;
        }
        silenceConfirmedRef.current = false;

        if (speakingSinceRef.current === null) speakingSinceRef.current = now;
        if (!isSpeaking && now - speakingSinceRef.current >= speechConfirmMs) {
          setIsSpeaking(true);
          onSpeechConfirmed?.();
        }
      } else {
        speakingSinceRef.current = null;
        if (silentSinceRef.current === null) silentSinceRef.current = now;
        const duration = now - silentSinceRef.current;
        setSilenceDurationMs(duration);

        if (isSpeaking) setIsSpeaking(false);

        if (duration >= silenceThresholdMs && !graceTimeoutRef.current && !silenceConfirmedRef.current) {
          // Fenêtre de grâce : on ne confirme la fin de tour qu'après un
          // délai supplémentaire pendant lequel la parole peut reprendre.
          graceTimeoutRef.current = setTimeout(() => {
            silenceConfirmedRef.current = true;
            onSilenceConfirmed?.();
            graceTimeoutRef.current = null;
          }, graceMs);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (graceTimeoutRef.current) clearTimeout(graceTimeoutRef.current);
      source.disconnect();
      audioCtx.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, volumeThreshold, speechConfirmMs, silenceThresholdMs, graceMs]);

  return { volume, isSpeaking, silenceDurationMs };
}
