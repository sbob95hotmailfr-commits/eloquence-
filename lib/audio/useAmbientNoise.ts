"use client";

import { useEffect, useRef } from "react";

/**
 * Simulation de public : léger bruit ambiant synthétisé (bruit rose filtré),
 * sans dépendance à un fichier audio externe.
 */
export function useAmbientNoise(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    const gain = ctx.createGain();
    gain.gain.value = 0.03;

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();

    return () => {
      source.stop();
      ctx.close().catch(() => {});
    };
  }, [enabled]);
}
