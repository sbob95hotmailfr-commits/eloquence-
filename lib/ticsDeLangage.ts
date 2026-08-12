export const TICS_DE_LANGAGE = [
  "euh",
  "genre",
  "du coup",
  "en fait",
  "en vrai",
  "voilà",
  "quoi",
  "bah",
  "donc voilà",
  "tu vois",
  "du coup du coup",
  "en gros",
  "après",
  "c'est-à-dire",
];

export function findTicSpans(text: string): Array<{ start: number; end: number; word: string }> {
  const spans: Array<{ start: number; end: number; word: string }> = [];
  for (const tic of TICS_DE_LANGAGE) {
    const regex = new RegExp(`\\b${tic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      spans.push({ start: match.index, end: match.index + match[0].length, word: match[0] });
    }
  }
  return spans.sort((a, b) => a.start - b.start);
}
