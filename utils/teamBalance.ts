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

export type BalanceResult = {
  team1: player[];
  team2: player[];
  moves: number;
};

// Minimum strength-point improvement required to apply a move. ~0.5 out of a
// combined total of several hundred is well under 0.1% — below this we treat the
// teams as already balanced and stop, avoiding pointless reshuffles.
const BALANCE_EPSILON = 0.5;

/**
 * Rearranges two teams with the fewest, most impactful moves so their combined
 * strength is split as close to 50/50 as achievable.
 *
 * Greedy hill-climb on the strength gap D = S1 - S2 (total strength is constant
 * since players only move between the two sides, so minimizing |D| drives the
 * balance bar to 50/50). Each iteration applies the single best operation:
 *   - a 1-for-1 swap (preserves both team counts), or
 *   - a one-way move, allowed only from the strictly larger team so the counts
 *     stay within 1 of each other.
 * Players in `lockedIds` (already batted/bowled) count toward strength but are
 * never moved. Deterministic: ties resolve to the first candidate found.
 */
export const balanceTeams = (
  team1Players: player[],
  team2Players: player[],
  statsMap: Record<string, PlayerStrengthStats>,
  lockedIds: string[] = [],
): BalanceResult => {
  const t1 = [...team1Players];
  const t2 = [...team2Players];
  const locked = new Set(lockedIds);
  const scoreOf = (p: player) => computePlayerScore(statsMap[p.id]);

  let s1 = t1.reduce((sum, p) => sum + scoreOf(p), 0);
  let s2 = t2.reduce((sum, p) => sum + scoreOf(p), 0);
  let moves = 0;

  // Each applied op strictly shrinks |D| by > EPSILON, so this is a generous
  // upper bound on the number of improving steps; the real terminator is the
  // "no improving op" break below.
  const maxIterations = 1 + Math.ceil(Math.abs(s1 - s2) / BALANCE_EPSILON);

  type Op =
    | { type: "swap"; i: number; j: number }
    | { type: "move"; from: 1 | 2; i: number };

  for (let iter = 0; iter < maxIterations; iter++) {
    const currentAbs = Math.abs(s1 - s2);
    let bestAbs = Infinity;
    let bestOp: Op | null = null;

    // Swaps — preserve counts. D' = D - 2*(a - b).
    for (let i = 0; i < t1.length; i++) {
      if (locked.has(t1[i].id)) continue;
      const a = scoreOf(t1[i]);
      for (let j = 0; j < t2.length; j++) {
        if (locked.has(t2[j].id)) continue;
        const b = scoreOf(t2[j]);
        const newAbs = Math.abs(s1 - s2 - 2 * (a - b));
        if (newAbs < bestAbs) {
          bestAbs = newAbs;
          bestOp = { type: "swap", i, j };
        }
      }
    }

    // One-way moves — only from the strictly larger team (keeps |count1-count2| <= 1).
    if (t1.length > t2.length) {
      for (let i = 0; i < t1.length; i++) {
        if (locked.has(t1[i].id)) continue;
        const a = scoreOf(t1[i]);
        const newAbs = Math.abs(s1 - s2 - 2 * a); // move team1 -> team2
        if (newAbs < bestAbs) {
          bestAbs = newAbs;
          bestOp = { type: "move", from: 1, i };
        }
      }
    } else if (t2.length > t1.length) {
      for (let j = 0; j < t2.length; j++) {
        if (locked.has(t2[j].id)) continue;
        const b = scoreOf(t2[j]);
        const newAbs = Math.abs(s1 - s2 + 2 * b); // move team2 -> team1
        if (newAbs < bestAbs) {
          bestAbs = newAbs;
          bestOp = { type: "move", from: 2, i: j };
        }
      }
    }

    if (!bestOp || bestAbs >= currentAbs - BALANCE_EPSILON) break;

    if (bestOp.type === "swap") {
      const a = t1[bestOp.i];
      const b = t2[bestOp.j];
      const aScore = scoreOf(a);
      const bScore = scoreOf(b);
      t1[bestOp.i] = b;
      t2[bestOp.j] = a;
      s1 += bScore - aScore;
      s2 += aScore - bScore;
    } else if (bestOp.from === 1) {
      const [a] = t1.splice(bestOp.i, 1);
      const aScore = scoreOf(a);
      t2.push(a);
      s1 -= aScore;
      s2 += aScore;
    } else {
      const [b] = t2.splice(bestOp.i, 1);
      const bScore = scoreOf(b);
      t1.push(b);
      s1 += bScore;
      s2 -= bScore;
    }
    moves++;
  }

  return { team1: t1, team2: t2, moves };
};

export type RandomBalanceResult = {
  team1: player[];
  team2: player[];
  changed: boolean;
};

export type RandomBalanceOptions = {
  attempts?: number; // how many random splits to sample
  slackPct?: number; // pick randomly among splits within this % of the fairest
  tightenAbovePct?: number; // if even the fairest split is this far from 50, refine it deterministically
  random?: () => number;
};

/**
 * Produces a *random* split of the two teams' players that is still close to a
 * 50/50 strength balance. Unlike `balanceTeams` (which deterministically funnels
 * to a single optimum), this samples many random splits and picks one at random
 * from among the fairest — so each call yields a different combination while
 * staying balanced.
 *
 * Team sizes are preserved and locked players (already batted/bowled) stay on
 * their current side. Only if every random split is badly skewed does it fall
 * back to nudging the fairest one with the deterministic optimizer.
 */
export const balanceTeamsRandom = (
  team1Players: player[],
  team2Players: player[],
  statsMap: Record<string, PlayerStrengthStats>,
  lockedIds: string[] = [],
  options: RandomBalanceOptions = {},
): RandomBalanceResult => {
  const attempts = options.attempts ?? 100;
  const slackPct = options.slackPct ?? 2;
  const tightenAbovePct = options.tightenAbovePct ?? 6;
  const rng = options.random ?? Math.random;

  const lockedSet = new Set(lockedIds);
  const locked1 = team1Players.filter((p) => lockedSet.has(p.id));
  const locked2 = team2Players.filter((p) => lockedSet.has(p.id));
  const movable = [...team1Players, ...team2Players].filter(
    (p) => !lockedSet.has(p.id),
  );

  const need1 = team1Players.length - locked1.length; // movable slots on team1

  // Not enough free players to make a different split.
  if (movable.length < 2 || need1 < 0 || need1 > movable.length) {
    return {
      team1: [...team1Players],
      team2: [...team2Players],
      changed: false,
    };
  }

  const shuffle = (arr: player[]): player[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const pctGap = (t1: player[], t2: player[]) => {
    const { pct1 } = computeBalance(
      computeTeamStrength(t1, statsMap),
      computeTeamStrength(t2, statsMap),
    );
    return Math.abs(pct1 - 50);
  };

  type Candidate = { team1: player[]; team2: player[]; d: number };
  const candidates: Candidate[] = [];
  for (let i = 0; i < attempts; i++) {
    const shuffled = shuffle(movable);
    const team1 = [...locked1, ...shuffled.slice(0, need1)];
    const team2 = [...locked2, ...shuffled.slice(need1)];
    candidates.push({ team1, team2, d: pctGap(team1, team2) });
  }

  const dMin = candidates.reduce((m, c) => Math.min(m, c.d), Infinity);
  const pool = candidates.filter((c) => c.d <= dMin + slackPct);
  const pick = pool[Math.floor(rng() * pool.length)];

  // Fairest random split is still skewed (very lopsided roster) — refine it.
  if (dMin > tightenAbovePct) {
    const refined = balanceTeams(
      pick.team1,
      pick.team2,
      statsMap,
      lockedIds,
    );
    return { team1: refined.team1, team2: refined.team2, changed: true };
  }

  return { team1: pick.team1, team2: pick.team2, changed: true };
};
