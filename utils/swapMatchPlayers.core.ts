import { playerStats } from "@/types/playerStats";
import { scorePerBall } from "@/types/scorePerBall";

// Pure, Firestore-free swap logic so it can be unit tested without pulling in
// the Firebase models (firebase/index.ts calls getApp() at import time). The
// Firestore orchestration lives in swapMatchPlayers.ts.

export type SwapMode = "batsman" | "bowler";

// A single ball as it comes back from MatchScore.getBallScores: player refs are
// plain { id, name } (or undefined), and the doc id ("ball_1", "ball_2", …) is
// carried on `id`.
export type BallDoc = scorePerBall & { id?: string };

export type PlayerRef = { id: string; name: string };

// Mutates `ball` in place, swapping A<->B in the refs relevant to `mode`.
// Returns a partial ball payload with only the changed fields (for Firestore),
// or null when this ball is unaffected.
export const swapBallRefs = (
  ball: BallDoc,
  mode: SwapMode,
  aId: string,
  bId: string,
  aName: string,
  bName: string
): Partial<scorePerBall> | null => {
  const write: Record<string, any> = {};

  const remap = (ref?: PlayerRef): PlayerRef | undefined => {
    if (!ref) return ref;
    if (ref.id === aId) return { id: bId, name: bName };
    if (ref.id === bId) return { id: aId, name: aName };
    return ref;
  };

  if (mode === "batsman") {
    (["strikerBatter", "nonStrikerBatter"] as const).forEach((key) => {
      const current = ball[key] as PlayerRef | undefined;
      const next = remap(current);
      if (next !== current) {
        (ball as any)[key] = next;
        write[key] = next;
      }
    });

    if (ball.outBatterId === aId || ball.outBatterId === bId) {
      const next = ball.outBatterId === aId ? bId : aId;
      ball.outBatterId = next;
      write.outBatterId = next;
    }
  } else {
    const current = ball.bowler as PlayerRef | undefined;
    const next = remap(current);
    if (next !== current) {
      (ball as any).bowler = next;
      write.bowler = next;
    }
  }

  return Object.keys(write).length > 0 ? write : null;
};

// Ball docs are named ball_1, ball_2, … — pull the numeric suffix.
export const ballNumberOf = (id?: string): number =>
  id ? parseInt(String(id).split("_")[1], 10) || 0 : 0;

// Fields that add across matches (subtract the old match figure, add the new).
export const SUMMABLE_FIELDS: (keyof playerStats)[] = [
  "runs",
  "ballsFaced",
  "fours",
  "sixes",
  "wickets",
  "extras",
  "runsConceded",
  "foursConceded",
  "sixesConceded",
  "maidens",
  "dotBalls",
  "catches",
  "stumpings",
  "runOuts",
];

const inningsContribution = (s: playerStats): number =>
  (s.ballsFaced || 0) > 0 ? 1 : 0;

// Mirrors updatePlayerCareerStats / updatePlayerTournamentStats.
const notOutContribution = (s: playerStats): number =>
  (s.ballsFaced || 0) === 0 && (s.runs || 0) === 0 ? 0 : s.isOut ? 0 : 1;

// Applies (current - oldMatch + newMatch) to a running aggregate doc, in place.
// matches / matchesWon are unchanged: both players already counted this match
// and they share a team, so the win/loss result doesn't move.
export const applyDelta = (
  agg: Record<string, any>,
  oldM: playerStats,
  newM: playerStats
): void => {
  SUMMABLE_FIELDS.forEach((f) => {
    agg[f] = (agg[f] || 0) - ((oldM as any)[f] || 0) + ((newM as any)[f] || 0);
  });

  // Overs/balls via an exact total-balls representation (avoids the fragile
  // one-shot carry the add/undo utils use).
  const asBalls = (s: { overs: number; ballsBowled: number }) =>
    (s.overs || 0) * 6 + (s.ballsBowled || 0);
  let totalBalls = asBalls(agg as any) - asBalls(oldM) + asBalls(newM);
  if (totalBalls < 0) totalBalls = 0;
  agg.overs = Math.floor(totalBalls / 6);
  agg.ballsBowled = totalBalls % 6;

  agg.innings =
    (agg.innings || 0) - inningsContribution(oldM) + inningsContribution(newM);
  agg.notOuts =
    (agg.notOuts || 0) - notOutContribution(oldM) + notOutContribution(newM);

  // Derived fields, recomputed from the resulting base figures.
  agg.strikeRate =
    (agg.ballsFaced || 0) > 0 ? (agg.runs / agg.ballsFaced) * 100 : 0;
  const battingInnings = (agg.innings || 0) - (agg.notOuts || 0);
  agg.average = agg.runs / (battingInnings <= 0 ? 1 : battingInnings);
  const oversDecimal = (agg.overs || 0) + (agg.ballsBowled || 0) / 6;
  agg.bowlingEconomy =
    oversDecimal > 0
      ? parseFloat((agg.runsConceded / oversDecimal).toFixed(2))
      : 0;
};
