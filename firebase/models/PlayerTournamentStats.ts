import { firestoreService } from "../services/firestore";
import { playerTournamentStats } from "../../types/playerTournamentStats";

const COLLECTION_NAME = "playerTournamentStats";

export class PlayerTournamentStats implements playerTournamentStats {
  playerId: string;
  tournamentId: string;
  matches: number;
  innings: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  average: number;
  notOuts: number;
  wickets: number;
  overs: number;
  ballsBowled: number;
  extras: number;
  runsConceded: number;
  foursConceded: number;
  sixesConceded: number;
  maidens: number;
  bowlingEconomy: number;
  dotBalls: number;
  clubId: string;

  constructor(playerId: string, data: playerTournamentStats) {
    this.playerId = playerId;
    this.tournamentId = data.tournamentId;
    this.matches = data.matches;
    this.innings = data.innings;
    this.runs = data.runs;
    this.ballsFaced = data.ballsFaced;
    this.fours = data.fours;
    this.sixes = data.sixes;
    this.strikeRate = data.strikeRate;
    this.average = data.average;
    this.notOuts = data.notOuts;
    this.wickets = data.wickets;
    this.overs = data.overs;
    this.ballsBowled = data.ballsBowled;
    this.extras = data.extras;
    this.runsConceded = data.runsConceded;
    this.foursConceded = data.foursConceded;
    this.sixesConceded = data.sixesConceded;
    this.maidens = data.maidens;
    this.bowlingEconomy = data.bowlingEconomy;
    this.dotBalls = data.dotBalls;
    this.clubId = data.clubId;
  }

  static async create(
    data: Omit<playerTournamentStats, "id">
  ): Promise<PlayerTournamentStats> {
    const id = await firestoreService.createWithAutoId(COLLECTION_NAME, data);
    return new PlayerTournamentStats(data.playerId, data);
  }

  static async getByPlayerId(
    playerId: string
  ): Promise<playerTournamentStats | null> {
    const data = await firestoreService.query<playerTournamentStats>(
      COLLECTION_NAME,
      [
        {
          field: "playerId",
          operator: "==",
          value: playerId,
        },
      ]
    );
    return data.length > 0 ? { ...data[0], id: data[0].id } : null;
  }

  static async getByPlayerIdAndTournamentId(
    playerId: string,
    tournamentId: string
  ): Promise<playerTournamentStats | null> {
    const data = await firestoreService.query<playerTournamentStats>(
      COLLECTION_NAME,
      [
        {
          field: "playerId",
          operator: "==",
          value: playerId,
        },
        {
          field: "tournamentId",
          operator: "==",
          value: tournamentId,
        },
      ]
    );
    return data.length > 0 ? { ...data[0], id: data[0].id } : null;
  }

  static async getAll(): Promise<PlayerTournamentStats[]> {
    const stats = await firestoreService.getAll<playerTournamentStats>(
      COLLECTION_NAME
    );
    return stats.map((stat) => new PlayerTournamentStats(stat.playerId, stat));
  }

  static async getAllFromClub(
    clubId: string
  ): Promise<PlayerTournamentStats[]> {
    const stats = await firestoreService.query<playerTournamentStats>(
      COLLECTION_NAME,
      [
        {
          field: "clubId",
          operator: "==",
          value: clubId,
        },
      ]
    );
    return stats.map((stat) => new PlayerTournamentStats(stat.playerId, stat));
  }

  static async getAllFromTournamentAndClub(
    tournamentId: string,
    clubId: string
  ): Promise<PlayerTournamentStats[]> {
    const stats = await firestoreService.query<playerTournamentStats>(
      COLLECTION_NAME,
      [
        {
          field: "clubId",
          operator: "==",
          value: clubId,
        },
        {
          field: "tournamentId",
          operator: "==",
          value: tournamentId,
        },
      ]
    );
    return stats.map((stat) => new PlayerTournamentStats(stat.playerId, stat));
  }

  static async getAllFromCache(): Promise<PlayerTournamentStats[]> {
    const stats = await firestoreService.getAllFromCache<playerTournamentStats>(
      COLLECTION_NAME
    );
    return stats.map((stat) => new PlayerTournamentStats(stat.playerId, stat));
  }

  static async update(
    id: string,
    data: Partial<playerTournamentStats>
  ): Promise<void> {
    try {
      await firestoreService.update(COLLECTION_NAME, id, data);
    } catch (error) {
      console.error("Error updating PlayerTournamentStats:", error);
    }
  }

  static async delete(playerId: string): Promise<void> {
    const stats = await this.getByPlayerId(playerId);
    if (stats) {
      await firestoreService.delete(COLLECTION_NAME, stats.id || "");
    } else {
      throw new Error(
        `PlayerTournamentStats not found for playerId: ${playerId}`
      );
    }
  }

  toObject(): playerTournamentStats {
    return {
      playerId: this.playerId,
      tournamentId: this.tournamentId,
      matches: this.matches,
      innings: this.innings,
      runs: this.runs,
      ballsFaced: this.ballsFaced,
      fours: this.fours,
      sixes: this.sixes,
      strikeRate: this.strikeRate,
      average: this.average,
      notOuts: this.notOuts,
      wickets: this.wickets,
      overs: this.overs,
      ballsBowled: this.ballsBowled,
      extras: this.extras,
      runsConceded: this.runsConceded,
      foursConceded: this.foursConceded,
      sixesConceded: this.sixesConceded,
      maidens: this.maidens,
      bowlingEconomy: this.bowlingEconomy,
      dotBalls: this.dotBalls,
      clubId: this.clubId,
    };
  }
}
