import { match } from "@/types/match";
import { TournamentStanding } from "@/firebase/models/TournamentStanding";
import { buildTournamentStandings, nrrFromTotals } from "./tournamentStandings";

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

// Incremental standings update for a single just-completed match — the same
// read-modify-write shape as updatePlayerTournamentStats, so it stays off the
// heavy path (reads only the two affected team rows, not every tournament
// match) and behaves like the player-stat update that already runs fine right
// before the post-match app reload.
//
// The per-match deltas come from buildTournamentStandings([finalizedMatch]),
// i.e. the exact same computation the from-scratch recompute uses, so the
// incremental and recompute paths can never diverge. finalizedMatch carries the
// final status/winner/currentScore straight from the completion handler, so no
// extra match read is needed.
export const updateTournamentStandings = async (
  tournamentId: string,
  clubId: string,
  finalizedMatch: match
): Promise<void> => {
  if (!tournamentId || !finalizedMatch) return;

  const deltas = buildTournamentStandings([finalizedMatch]);

  await Promise.all(
    deltas.map(async (d) => {
      const existing = await TournamentStanding.getByTeam(
        tournamentId,
        d.teamInitials
      );

      const totalRunsScored = (existing?.totalRunsScored ?? 0) + d.totalRunsScored;
      const totalOversFaced = round3(
        (existing?.totalOversFaced ?? 0) + d.totalOversFaced
      );
      const totalRunsConceded =
        (existing?.totalRunsConceded ?? 0) + d.totalRunsConceded;
      const totalOversBowled = round3(
        (existing?.totalOversBowled ?? 0) + d.totalOversBowled
      );

      await TournamentStanding.upsert({
        tournamentId,
        clubId,
        teamInitials: d.teamInitials,
        teamName: d.teamName,
        played: (existing?.played ?? 0) + d.played,
        wins: (existing?.wins ?? 0) + d.wins,
        losses: (existing?.losses ?? 0) + d.losses,
        ties: (existing?.ties ?? 0) + d.ties,
        points: (existing?.points ?? 0) + d.points,
        totalRunsScored,
        totalOversFaced,
        totalRunsConceded,
        totalOversBowled,
        nrr: nrrFromTotals(
          totalRunsScored,
          totalOversFaced,
          totalRunsConceded,
          totalOversBowled
        ),
      });
    })
  );
};
