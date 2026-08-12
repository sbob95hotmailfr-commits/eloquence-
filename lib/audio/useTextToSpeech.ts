"use client";

import { useCallback, useRef, useState } from "react";

// Un WAV silencieux d'un échantillon — sert uniquement à débloquer la lecture
// audio sur mobile (Safari/Chrome exigent qu'un <audio> ait déjà été lancé
// depuis un vrai geste utilisateur avant d'accepter un play() différé).
const SILENT_AUDIO =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const unlockedRef = useRef(false);

  function getAudio() {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return audioRef.current;
  }

  /**
   * À appeler depuis un vrai geste utilisateur (clic sur "Commencer").
   * Débloque la lecture audio pour les appels play() déclenchés plus tard
   * depuis une réponse réseau asynchrone (bloqués sinon sur mobile).
   */
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    const audio = getAudio();
    audio.src = SILENT_AUDIO;
    audio.play().catch(() => {});
  }, []);

  const cleanupUrl = () => {
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
  };

  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    const audio = getAudio();

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Échec de la synthèse vocale");

      const blob = await res.blob();
      cleanupUrl();
      const url = URL.createObjectURL(blob);
      currentUrlRef.current = url;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        cleanupUrl();
        onEnd?.();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        cleanupUrl();
        onEnd?.();
      };

      audio.src = url;
      await audio.play();
    } catch {
      setIsSpeaking(false);
      onEnd?.();
    }
  }, []);

  const interrupt = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsSpeaking(false);
  }, []);

  return { speak, interrupt, isSpeaking, unlock };
}
