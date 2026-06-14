export const LOVE_BOND_LEVELS = [
  { level: 1, name: "初识", requiredLovePoints: 0 },
  { level: 2, name: "心动", requiredLovePoints: 20 },
  { level: 3, name: "热恋", requiredLovePoints: 60 },
  { level: 4, name: "默契", requiredLovePoints: 150 },
  { level: 5, name: "灵魂伴侣", requiredLovePoints: 300 },
] as const;

export function loveBondFor(lovePoints: number) {
  const points = Math.max(0, Math.floor(lovePoints));
  const currentIndex = LOVE_BOND_LEVELS.findLastIndex(
    (level) => points >= level.requiredLovePoints,
  );
  const current = LOVE_BOND_LEVELS[Math.max(0, currentIndex)];
  const next = LOVE_BOND_LEVELS[currentIndex + 1] ?? null;
  const progressPoints = points - current.requiredLovePoints;
  const levelRange = next
    ? next.requiredLovePoints - current.requiredLovePoints
    : 0;

  return {
    ...current,
    lovePoints: points,
    next,
    progressPoints,
    levelRange,
    progressPercent: next
      ? Math.min(100, Math.round((progressPoints / levelRange) * 100))
      : 100,
    pointsToNextLevel: next
      ? Math.max(0, next.requiredLovePoints - points)
      : 0,
  };
}
