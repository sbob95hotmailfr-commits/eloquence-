"use client";

import { findTicSpans } from "@/lib/ticsDeLangage";
import { PauseMark } from "@/components/ui/PauseMark";
import type { FeedbackPointCite } from "@/types/domain";

interface Pause {
  atSecond: number;
  durationSeconds: number;
}

/**
 * Layout signature "manuscrit annoté" : la transcription occupe la zone
 * principale comme un texte imprimé, avec les tics de langage surlignés ;
 * une marge étroite affiche les annotations du coach IA façon corrections
 * manuscrites.
 */
export function AnnotatedTranscript({
  transcription,
  pointsForts,
  pointsFaibles,
  pauses = [],
}: {
  transcription: string;
  pointsForts: FeedbackPointCite[];
  pointsFaibles: FeedbackPointCite[];
  pauses?: Pause[];
}) {
  const ticSpans = findTicSpans(transcription);

  const segments: Array<{ text: string; isTic: boolean }> = [];
  let cursor = 0;
  for (const span of ticSpans) {
    if (span.start > cursor) segments.push({ text: transcription.slice(cursor, span.start), isTic: false });
    segments.push({ text: transcription.slice(span.start, span.end), isTic: true });
    cursor = span.end;
  }
  if (cursor < transcription.length) segments.push({ text: transcription.slice(cursor), isTic: false });

  const annotations = [
    ...pointsForts.map((p) => ({ ...p, tone: "force" as const })),
    ...pointsFaibles.map((p) => ({ ...p, tone: "faible" as const })),
  ];

  return (
    <div className="grid grid-cols-[1fr_auto] gap-6">
      <div className="font-display text-lg leading-relaxed whitespace-pre-wrap">
        {segments.map((seg, i) =>
          seg.isTic ? (
            <mark
              key={i}
              className="bg-rouge-correcteur/15 text-rouge-correcteur rounded px-0.5 not-italic font-sans"
              title="Tic de langage"
            >
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
        {pauses.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 font-sans text-xs text-foreground/60">
            {pauses.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <PauseMark durationSeconds={p.durationSeconds} /> à {p.atSecond.toFixed(0)}s
              </span>
            ))}
          </div>
        )}
      </div>

      <aside className="annotation-margin w-56 space-y-4 pl-4 text-sm">
        {annotations.map((a, i) => (
          <p key={i} className={a.tone === "force" ? "annotation-force" : "annotation-faible"}>
            « {a.exemple_transcription} » — {a.constat}
          </p>
        ))}
      </aside>
    </div>
  );
}
