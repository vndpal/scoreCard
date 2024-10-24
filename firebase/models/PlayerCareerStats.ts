import { firestoreService } from "../services/firestore";
import { playerCareerStats } from "../../types/playerCareerStats";

const COLLECTION_NAME = "playerCareerStats";

export class PlayerCareerStats implements playerCareerStats {
  playerId: string;
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

  constructor(playerId: string, data: playerCareerStats) {
    this.playerId = playerId;
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
  }

  static async create(
    data: Omit<playerCareerStats, "id">
  ): Promise<PlayerCareerStats> {
    const id = await firestoreService.createWithAutoId(COLLECTION_NAME, data);
    return new PlayerCareerStats(data.playerId, data);
  }

  static async getByPlayerId(
    playerId: string
  ): Promise<playerCareerStats | null> {
    const data = await firestoreService.query<playerCareerStats>(
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

  static async getAll(): Promise<PlayerCareerStats[]> {
    const stats = await firestoreService.getAll<playerCareerStats>(
      COLLECTION_NAME
    );
    return stats.map((stat) => new PlayerCareerStats(stat.playerId, stat));
  }

  static async update(
    playerId: string,
    data: Partial<playerCareerStats>
  ): Promise<void> {
    const stats = await this.getByPlayerId(playerId);
    if (stats) {
      try {
        await firestoreService.update(COLLECTION_NAME, stats.id || "", data);
      } catch (error) {
        console.error("Error updating PlayerCareerStats:", error);
      }
    } else {
      throw new Error(`PlayerCareerStats not found for playerId: ${playerId}`);
    }
  }

  static async delete(playerId: string): Promise<void> {
    const stats = await this.getByPlayerId(playerId);
    if (stats) {
      await firestoreService.delete(COLLECTION_NAME, stats.id || "");
    } else {
      throw new Error(`PlayerCareerStats not found for playerId: ${playerId}`);
    }
  }

  toObject(): playerCareerStats {
    return {
      playerId: this.playerId,
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
    };
  }
}
