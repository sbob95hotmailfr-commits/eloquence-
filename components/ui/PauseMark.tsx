/**
 * La marque de pause — signature visuelle d'Éloquence.
 * La longueur du glyphe encode la durée du silence : —, ——, ———.
 */
export function pauseMarkGlyph(durationSeconds: number): string {
  if (durationSeconds < 1) return "–";
  if (durationSeconds < 2) return "—";
  if (durationSeconds < 3) return "——";
  return "———";
}

export function PauseMark({
  durationSeconds,
  className = "",
}: {
  durationSeconds: number;
  className?: string;
}) {
  return (
    <span
      className={`pause-mark ${className}`}
      title={`Pause de ${durationSeconds.toFixed(1)}s`}
    >
      {pauseMarkGlyph(durationSeconds)}
    </span>
  );
}

/** Indicateur de chargement animé utilisant la marque de pause. */
export function PauseMarkLoader({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 pause-mark text-lg">
      <span className="animate-pulse">———</span>
      {label && <span className="font-sans text-sm text-foreground/70">{label}</span>}
    </div>
  );
}
