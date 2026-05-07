import { player } from "@/types/player";

export type PlayerStrengthStats = {
  sr: number;
  eco: number;
  runs: number;
  wickets: number;
  matches: number;
  ballsFaced: number;
  ballsBowled: number;
};

const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

const asymmetricScore = (
  delta: number,
  bonusSpan: number,
  penaltySpan: number,
): number =>
  delta >= 0
    ? clamp(delta / bonusSpan, 0, 1)
    : clamp(delta / penaltySpan, -1, 0);

export const computePlayerScore = (
  stats: PlayerStrengthStats | undefined,
): number => {
  const ballsFaced = stats?.ballsFaced ?? 0;
  const ballsBowled = stats?.ballsBowled ?? 0;

  const srScore = asymmetricScore((stats?.sr ?? 0) - 200, 400, 150);
  const ecoScore = asymmetricScore(15 - (stats?.eco ?? 0), 15, 21);

  const batSub =
    ballsFaced > 0
      ? srScore * 0.75 +
        clamp(((stats?.runs ?? 0) - 250) / 250, -1, 1) * 0.25
      : 0;

  const bowlSub =
    ballsBowled > 0
      ? ecoScore * 0.75 +
        clamp(((stats?.wickets ?? 0) - 10) / 10, -1, 1) * 0.25
      : 0;

  const penalty = (s: number) => (s < 0 ? s * 1.5 : s);

  const totalBalls = ballsFaced + ballsBowled;
  if (totalBalls === 0) return 50;
  const raw =
    (penalty(batSub) * ballsFaced + penalty(bowlSub) * ballsBowled) /
    totalBalls;

  return clamp(50 + raw * 50, 0, 100);
};

export const computeTeamStrength = (
  players: player[],
  statsMap: Record<string, PlayerStrengthStats>,
): number => {
  if (!players || players.length === 0) return 0;
  let sum = 0;
  for (const p of players) {
    sum += computePlayerScore(statsMap[p.id]);
  }
  return sum;
};

export const computeBalance = (
  t1Strength: number,
  t2Strength: number,
): { share1: number; share2: number; pct1: number; pct2: number } => {
  const total = t1Strength + t2Strength;
  if (total <= 0) {
    return { share1: 0.5, share2: 0.5, pct1: 50, pct2: 50 };
  }
  const share1 = t1Strength / total;
  const share2 = 1 - share1;
  const pct1 = Math.round(share1 * 100);
  const pct2 = 100 - pct1;
  return { share1, share2, pct1, pct2 };
};
