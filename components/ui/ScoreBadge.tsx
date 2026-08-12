import { clsx } from "clsx";

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const tone =
    score >= 7 ? "text-laiton border-laiton" : score >= 4 ? "text-foreground border-border-subtle" : "text-rouge-correcteur border-rouge-correcteur";

  return (
    <span
      className={clsx(
        "font-mono-util inline-flex items-center justify-center rounded-full border-2",
        tone,
        size === "sm" && "h-8 w-8 text-xs",
        size === "md" && "h-12 w-12 text-base",
        size === "lg" && "h-16 w-16 text-xl"
      )}
    >
      {score.toFixed(1)}
    </span>
  );
}
