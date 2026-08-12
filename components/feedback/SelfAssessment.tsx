"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function SelfAssessment({ onSubmit }: { onSubmit: (score: number) => void }) {
  const [score, setScore] = useState(5);

  return (
    <Card className="max-w-md mx-auto text-center">
      <h2 className="font-display text-xl mb-2">Avant de voir le score IA…</h2>
      <p className="text-sm text-foreground/70 mb-6">
        Comment évaluez-vous votre propre prise de parole, sur 10 ?
      </p>
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={score}
        onChange={(e) => setScore(Number(e.target.value))}
        className="w-full accent-laiton"
      />
      <div className="font-mono-util text-3xl my-4">{score.toFixed(1)}</div>
      <Button onClick={() => onSubmit(score)} className="w-full">
        Voir mon feedback
      </Button>
    </Card>
  );
}
