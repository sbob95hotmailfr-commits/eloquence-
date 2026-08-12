export function computeCurrentStreak(sessionDates: string[]): number {
  const days = new Set(sessionDates.map((d) => new Date(d).toDateString()));
  let streak = 0;
  const cursor = new Date();

  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
