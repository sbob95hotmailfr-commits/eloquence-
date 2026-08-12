import { Card } from "@/components/ui/Card";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { AnnotatedTranscript } from "@/components/feedback/AnnotatedTranscript";
import type { FeedbackResult } from "@/types/domain";

export function FeedbackReport({
  feedback,
  transcription,
  autoEvaluation,
  pauses = [],
}: {
  feedback: FeedbackResult;
  transcription: string;
  autoEvaluation?: number;
  pauses?: { atSecond: number; durationSeconds: number }[];
}) {
  const ecart = autoEvaluation !== undefined ? feedback.score_global - autoEvaluation : null;

  return (
    <div className="space-y-6">
      <Card className="flex items-center gap-6">
        <ScoreBadge score={feedback.score_global} size="lg" />
        <div>
          <h2 className="font-display text-xl">Score global</h2>
          {ecart !== null && (
            <p className="text-sm text-foreground/70">
              Votre auto-évaluation : {autoEvaluation?.toFixed(1)} —{" "}
              {Math.abs(ecart) < 0.5
                ? "vous vous êtes évalué avec justesse."
                : ecart > 0
                ? `l'IA vous note ${ecart.toFixed(1)} pt(s) au-dessus de votre propre estimation.`
                : `l'IA vous note ${Math.abs(ecart).toFixed(1)} pt(s) en dessous de votre propre estimation.`}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-lg mb-3">Scores par critère</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(feedback.scores_par_critere).map(([critere, score]) => (
            <div key={critere} className="flex items-center gap-2">
              <ScoreBadge score={score} size="sm" />
              <span className="text-sm capitalize">{critere.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-lg mb-3">Transcription annotée</h3>
        <AnnotatedTranscript
          transcription={transcription}
          pointsForts={feedback.points_forts}
          pointsFaibles={feedback.points_faibles}
          pauses={pauses}
        />
      </Card>

      <Card>
        <h3 className="font-display text-lg mb-3">Conseils actionnables</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {feedback.conseils_actionnables.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </Card>

      {feedback.corrections.length > 0 && (
        <Card>
          <h3 className="font-display text-lg mb-3">Corrections</h3>
          <div className="space-y-3">
            {feedback.corrections.map((c, i) => (
              <div key={i} className="border-l-2 border-rouge-correcteur pl-3">
                <p className="text-sm">
                  <span className="text-rouge-correcteur line-through">{c.erreur}</span> →{" "}
                  <span className="text-laiton">{c.suggestion}</span>
                </p>
                <p className="text-xs text-foreground/60 mt-1">{c.explication}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
