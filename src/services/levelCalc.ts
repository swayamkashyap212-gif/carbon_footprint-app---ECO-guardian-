export function calculateLevel(totalXp: number): { level: number; xp: number; xpToNextLevel: number } {
  let level = 1;
  let xpRemaining = totalXp;
  let threshold = 200;
  while (xpRemaining >= threshold) {
    xpRemaining -= threshold;
    level++;
    threshold = Math.floor(threshold * 1.3);
  }
  return { level, xp: xpRemaining, xpToNextLevel: threshold - xpRemaining };
}
