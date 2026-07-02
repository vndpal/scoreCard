import { tournamentStanding } from "@/types/tournamentStanding";
import { firestoreService } from "../services/firestore";

const COLLECTION_NAME = "tournamentStandings";

// Deterministic doc id so recomputes upsert the same row instead of piling up
// duplicates. teamInitials is immutable, so this stays stable across renames.
const docId = (tournamentId: string, teamInitials: string) =>
  `${tournamentId}_${teamInitials}`;

export class TournamentStanding implements tournamentStanding {
  id?: string;
  tournamentId: string;
  clubId: string;
  teamInitials: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  totalRunsScored: number;
  totalOversFaced: number;
  totalRunsConceded: number;
  totalOversBowled: number;
  nrr: number;

  constructor(id: string, data: tournamentStanding) {
    this.id = id;
    this.tournamentId = data.tournamentId;
    this.clubId = data.clubId;
    this.teamInitials = data.teamInitials;
    this.teamName = data.teamName;
    this.played = data.played;
    this.wins = data.wins;
    this.losses = data.losses;
    this.ties = data.ties;
    this.points = data.points;
    this.totalRunsScored = data.totalRunsScored;
    this.totalOversFaced = data.totalOversFaced;
    this.totalRunsConceded = data.totalRunsConceded;
    this.totalOversBowled = data.totalOversBowled;
    this.nrr = data.nrr;
  }

  static async upsert(data: Omit<tournamentStanding, "id">): Promise<void> {
    const id = docId(data.tournamentId, data.teamInitials);
    await firestoreService.upsert(COLLECTION_NAME, id, data);
  }

  // Single-row read by the deterministic id, so the incremental updater can
  // read-modify-write one team's row without querying the whole tournament.
  static async getByTeam(
    tournamentId: string,
    teamInitials: string
  ): Promise<TournamentStanding | null> {
    const id = docId(tournamentId, teamInitials);
    const data = await firestoreService.get<tournamentStanding>(
      COLLECTION_NAME,
      id
    );
    return data ? new TournamentStanding(id, data) : null;
  }

  static async getByTournament(
    tournamentId: string
  ): Promise<TournamentStanding[]> {
    const data = await firestoreService.query<tournamentStanding>(
      COLLECTION_NAME,
      [{ field: "tournamentId", operator: "==", value: tournamentId }]
    );
    return data.map((doc) => new TournamentStanding(doc.id ?? "", doc));
  }

  static async deleteById(id: string): Promise<void> {
    await firestoreService.delete(COLLECTION_NAME, id);
  }
}
