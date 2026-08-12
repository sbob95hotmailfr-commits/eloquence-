export const LECTURE_PASSAGES = [
  "La véritable éloquence se moque de l'éloquence : elle dit tout ce qu'il faut, et seulement ce qu'il faut. Elle naît de la clarté de la pensée avant celle du style.",
  "Un bon orateur n'est pas celui qui parle le plus fort, mais celui qui sait à quel moment se taire pour laisser résonner ce qu'il vient de dire.",
  "Convaincre, ce n'est pas imposer une idée : c'est construire, avec son interlocuteur, le chemin qui mène jusqu'à elle.",
];

export const IMPROVISATION_TOPICS = [
  "Décrivez, en 60 secondes, la meilleure décision que vous ayez prise cette année et pourquoi.",
  "Un ami vous demande son avis sincère sur un projet auquel vous ne croyez pas. Expliquez comment vous le lui diriez.",
  "Présentez en 60 secondes une idée qui pourrait améliorer votre quotidien, comme si vous pitchiez devant un jury.",
  "Racontez une situation où vous avez dû changer d'avis en pleine discussion.",
];

export function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
