import { match } from "@/types/match";
import { currentTotalScore } from "@/types/currentTotalScore";
import { tournamentStanding } from "@/types/tournamentStanding";

// Wickets that constitute "all out" when a match doesn't record its own count.
const DEFAULT_WICKETS = 10;

// Per-team contribution from a single match, in the exact shape the NRR
// aggregator consumes.
export type TeamMatchResult = {
  battingRuns: number;
  battingOvers: number; // actual overs faced, true decimal (overs + balls/6)
  battingAllOut: boolean;
  bowlingRuns: number;
  bowlingOvers: number; // opposition's actual overs faced, true decimal
  allottedOvers: number; // e.g. 20 for T20, 50 for ODI
};

export type NrrAggregate = {
  totalRunsScored: number;
  totalOversFaced: number;
  totalRunsConceded: number;
  totalOversBowled: number;
  nrr: number;
};

// Convert cricket overs.balls to a true decimal over count. 16 overs 4 balls is
// 16 + 4/6, never 16.4.
const toDecimalOvers = (score: currentTotalScore): number =>
  (score?.totalOvers ?? 0) + (score?.totalBalls ?? 0) / 6;

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

// NRR straight from already-accumulated cumulative totals (used by the
// incremental standings updater). Zero overs → 0, never divides by zero.
// Mirrors the final step of calculateNRR so the two paths stay identical.
export const nrrFromTotals = (
  totalRunsScored: number,
  totalOversFaced: number,
  totalRunsConceded: number,
  totalOversBowled: number
): number => {
  const forRate = totalOversFaced > 0 ? totalRunsScored / totalOversFaced : 0;
  const againstRate =
    totalOversBowled > 0 ? totalRunsConceded / totalOversBowled : 0;
  return totalOversFaced > 0 && totalOversBowled > 0
    ? round3(forRate - againstRate)
    : 0;
};

// Pure NRR aggregator. Accumulates one team's per-match results and returns the
// totals + final NRR. Zero matches / zero overs → nrr 0 (never divides by zero).
export const calculateNRR = (results: TeamMatchResult[]): NrrAggregate => {
  let totalRunsScored = 0;
  let totalOversFaced = 0;
  let totalRunsConceded = 0;
  let totalOversBowled = 0;

  for (const r of results) {
    totalRunsScored += r.battingRuns;
    // A side that was bowled out counts the full allotted overs for the
    // runs-scored (batting) side of the calc; otherwise the actual overs faced.
    totalOversFaced += r.battingAllOut ? r.allottedOvers : r.battingOvers;
    totalRunsConceded += r.bowlingRuns;
    // The bowling side always uses the opposition's actual overs faced, even
    // when the opposition was bowled out.
    totalOversBowled += r.bowlingOvers;
  }

  const forRate = totalOversFaced > 0 ? totalRunsScored / totalOversFaced : 0;
  const againstRate =
    totalOversBowled > 0 ? totalRunsConceded / totalOversBowled : 0;
  const nrr =
    totalOversFaced > 0 && totalOversBowled > 0
      ? round3(forRate - againstRate)
      : 0;

  return {
    totalRunsScored,
    totalOversFaced: round3(totalOversFaced),
    totalRunsConceded,
    totalOversBowled: round3(totalOversBowled),
    nrr,
  };
};

type TeamAgg = {
  tournamentId: string;
  clubId: string;
  teamInitials: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  results: TeamMatchResult[];
};

// Only completed and tied matches move the table. Live / abandoned / draw /
// noResult are ignored (not counted as played).
const isDecisive = (m: match): boolean =>
  m.status === "completed" || m.status === "tied";

// Builds the full standings for a tournament from its matches. Keys teams by the
// immutable teamInitials (match.team1 / match.team2) so a renamed team stays one
// row; the display name is taken from the first match seen for that team, so
// pass matches newest-first to prefer the latest name. Sorted by points desc,
// then NRR desc.
export const buildTournamentStandings = (
  matches: match[]
): Omit<tournamentStanding, "id">[] => {
  const acc: Record<string, TeamAgg> = {};

  const ensure = (
    initials: string,
    name: string,
    tournamentId: string,
    clubId: string
  ): TeamAgg => {
    if (!acc[initials]) {
      acc[initials] = {
        tournamentId,
        clubId,
        teamInitials: initials,
        teamName: name || initials,
        played: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        points: 0,
        results: [],
      };
    }
    return acc[initials];
  };

  for (const m of matches) {
    if (!isDecisive(m)) continue;
    if (!m.team1 || !m.team2) continue;
    const s1 = m.currentScore?.team1;
    const s2 = m.currentScore?.team2;
    if (!s1 || !s2) continue;

    const allotted = m.overs ?? 0;
    const maxWickets = m.wickets ?? DEFAULT_WICKETS;
    const o1 = toDecimalOvers(s1);
    const o2 = toDecimalOvers(s2);

    const t1 = ensure(m.team1, m.team1Fullname, m.tournamentId, m.clubId);
    const t2 = ensure(m.team2, m.team2Fullname, m.tournamentId, m.clubId);

    t1.results.push({
      battingRuns: s1.totalRuns ?? 0,
      battingOvers: o1,
      battingAllOut: (s1.totalWickets ?? 0) >= maxWickets,
      bowlingRuns: s2.totalRuns ?? 0,
      bowlingOvers: o2,
      allottedOvers: allotted,
    });
    t2.results.push({
      battingRuns: s2.totalRuns ?? 0,
      battingOvers: o2,
      battingAllOut: (s2.totalWickets ?? 0) >= maxWickets,
      bowlingRuns: s1.totalRuns ?? 0,
      bowlingOvers: o1,
      allottedOvers: allotted,
    });

    t1.played += 1;
    t2.played += 1;

    if (m.status === "tied") {
      t1.ties += 1;
      t2.ties += 1;
      t1.points += 1;
      t2.points += 1;
    } else if (m.winner === "team1") {
      t1.wins += 1;
      t1.points += 2;
      t2.losses += 1;
    } else {
      t2.wins += 1;
      t2.points += 2;
      t1.losses += 1;
    }
  }

  const standings = Object.values(acc).map((a) => {
    const agg = calculateNRR(a.results);
    return {
      tournamentId: a.tournamentId,
      clubId: a.clubId,
      teamInitials: a.teamInitials,
      teamName: a.teamName,
      played: a.played,
      wins: a.wins,
      losses: a.losses,
      ties: a.ties,
      points: a.points,
      totalRunsScored: agg.totalRunsScored,
      totalOversFaced: agg.totalOversFaced,
      totalRunsConceded: agg.totalRunsConceded,
      totalOversBowled: agg.totalOversBowled,
      nrr: agg.nrr,
    };
  });

  standings.sort((x, y) => y.points - x.points || y.nrr - x.nrr);
  return standings;
};
