import { Match } from "@/firebase/models/Match";
import { TournamentStanding } from "@/firebase/models/TournamentStanding";
import { buildTournamentStandings } from "./tournamentStandings";
import { match } from "@/types/match";

// Newest-first sort so buildTournamentStandings prefers each team's latest name.
const toMillis = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  return 0;
};

// Rebuilds the tournamentStandings rows for a tournament from scratch off its
// decisive matches, then reconciles the collection (upsert present teams, delete
// removed ones). Idempotent and self-healing.
//
// Used on UNDO of a completed match (not on completion — completion uses the
// lightweight incremental updateTournamentStandings). Undo isn't followed by an
// app reload, so the from-scratch read of all tournament matches is fine here,
// and rebuilding from scratch trivially drops the undone match's contribution
// and corrects any incremental drift.
//
// finalizedMatch is the just-changed match in its authoritative final state.
// firestoreService writes are fire-and-forget, so a fresh getByTournament may
// not yet reflect the status we just wrote; merging it in by matchId removes
// that race. On undo pass it with status "live" so it drops out of the decisive
// set and its contribution is removed.
export const recomputeTournamentStandings = async (
  tournamentId: string,
  clubId: string,
  finalizedMatch?: match
): Promise<void> => {
  if (!tournamentId) return;

  const fetched = await Match.getByTournament(tournamentId);
  const matches: match[] = [...fetched];

  if (finalizedMatch) {
    const idx = matches.findIndex(
      (m) => m.matchId === finalizedMatch.matchId
    );
    if (idx > -1) matches[idx] = finalizedMatch;
    else matches.push(finalizedMatch);
  }

  matches.sort((a, b) => toMillis(b.startDateTime) - toMillis(a.startDateTime));

  const computed = buildTournamentStandings(matches);
  const existing = await TournamentStanding.getByTournament(tournamentId);
  const presentKeys = new Set(computed.map((s) => s.teamInitials));

  await Promise.all([
    ...computed.map((s) =>
      TournamentStanding.upsert({ ...s, tournamentId, clubId })
    ),
    ...existing
      .filter((e) => e.id && !presentKeys.has(e.teamInitials))
      .map((e) => TournamentStanding.deleteById(e.id as string)),
  ]);
};
