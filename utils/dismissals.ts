import { playerStats } from "@/types/playerStats";
import { scorePerInning } from "@/types/scorePerInnig";

export interface DismissalInfo {
  playerId: string;
  bowlerName: string;
  outType?: string;
  fielderName?: string;
}

/**
 * Builds a playerId -> dismissal map from the ball-by-ball data of one or more
 * innings. Takes plain ball arrays (not `MatchScore[]`) so this module stays
 * free of any firebase import — `firebase/index.ts` calls `getApp()` at import
 * time, which makes anything that touches it unusable from jest.
 *
 * Callers holding `MatchScore[]` should pass `scores.map((s) => s.overSummary)`.
 */
export const buildDismissalMap = (
  ...innings: (scorePerInning | null | undefined)[]
): Map<string, DismissalInfo> => {
  const dismissals = new Map<string, DismissalInfo>();

  try {
    innings.forEach((overs) => {
      if (!overs || !Array.isArray(overs)) return;
      overs.forEach((over: any) => {
        if (!over || !Array.isArray(over)) return;
        over.forEach((ball: any) => {
          if (!ball?.isWicket) return;
          // Prefer the explicit out batter (covers run-outs of the
          // non-striker); fall back to the striker for older balls.
          const playerId =
            ball.outBatterId?.toString() ||
            ball.strikerBatter?.id?.toString() ||
            "";
          if (!playerId) return;
          dismissals.set(playerId, {
            playerId,
            bowlerName: ball.bowler?.name || "Unknown",
            outType: ball.outType,
            fielderName: ball.fielder?.name,
          });
        });
      });
    });
  } catch (err) {
    console.log("Error building dismissals:", err);
  }

  return dismissals;
};

/** Curries a dismissal map into the `getDismissalStatus` the tables expect. */
export const makeGetDismissalStatus =
  (dismissalMap: Map<string, DismissalInfo>) =>
  (stat: playerStats): string => {
    const d = dismissalMap.get(stat.playerId);
    if (!d) return "not out";
    switch (d.outType) {
      case "caught":
        return d.fielderName
          ? `c ${d.fielderName} b ${d.bowlerName}`
          : `c & b ${d.bowlerName}`;
      case "stumped":
        return d.fielderName
          ? `st ${d.fielderName} b ${d.bowlerName}`
          : `st b ${d.bowlerName}`;
      case "runout":
        return d.fielderName ? `run out (${d.fielderName})` : "run out";
      case "bowled":
      default:
        return `b ${d.bowlerName}`;
    }
  };
