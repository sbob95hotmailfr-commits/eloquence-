"use client";

import { useCallback, useRef, useState } from "react";

function pickFrenchVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("fr")) ??
    voices[0] ??
    null
  );
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const unlockedRef = useRef(false);

  /**
   * À appeler depuis un vrai geste utilisateur (clic sur "Commencer").
   * Safari/Chrome mobile bloquent silencieusement speechSynthesis.speak()
   * si le tout premier appel n'est pas déclenché synchroniquement par un
   * geste utilisateur — un appel "silencieux" ici débloque les suivants,
   * même ceux lancés plus tard depuis une réponse réseau asynchrone.
   */
  const unlock = useCallback(() => {
    if (unlockedRef.current || typeof window === "undefined" || !window.speechSynthesis) return;
    unlockedRef.current = true;
    const primer = new SpeechSynthesisUtterance(" ");
    primer.volume = 0;
    window.speechSynthesis.speak(primer);
    // Force le chargement de la liste des voix (vide au premier appel sur
    // certains navigateurs tant que l'event voiceschanged n'a pas eu lieu).
    window.speechSynthesis.getVoices();
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 1;
    const voice = pickFrenchVoice();
    if (voice) utterance.voice = voice;
    utteranceRef.current = utterance;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const interrupt = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, interrupt, isSpeaking, unlock };
}
