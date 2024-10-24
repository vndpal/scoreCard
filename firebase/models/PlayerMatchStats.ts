import { firestoreService } from "../services/firestore";
import { playerMatchStats } from "../../types/playerMatchStats";
import { playerStats } from "../../types/playerStats";

const COLLECTION_NAME = "playerMatchStats";

export class PlayerMatchStats implements playerMatchStats {
  matchId: string;
  playerMatchStats: playerStats[];

  constructor(data: playerMatchStats) {
    this.matchId = data.matchId;
    this.playerMatchStats = data.playerMatchStats;
  }

  static async create(data: playerMatchStats): Promise<PlayerMatchStats> {
    const id = await firestoreService.createWithAutoId(COLLECTION_NAME, data);
    return new PlayerMatchStats(data);
  }

  static async getByMatchId(matchId: string): Promise<playerMatchStats | null> {
    if (!matchId) {
      return null;
    }

    const data = await firestoreService.query<playerMatchStats>(
      COLLECTION_NAME,
      [
        {
          field: "matchId",
          operator: "==",
          value: matchId,
        },
      ]
    );
    const res = data.length > 0 ? { ...data[0], id: data[0].id } : null;
    return res;
  }

  static async getAll(): Promise<PlayerMatchStats[]> {
    const stats = await firestoreService.getAll<playerMatchStats>(
      COLLECTION_NAME
    );
    return stats.map((stat) => new PlayerMatchStats(stat));
  }

  static async update(
    matchId: string,
    data: Partial<playerMatchStats>
  ): Promise<void> {
    const stats = await this.getByMatchId(matchId);
    if (stats) {
      try {
        await firestoreService.update(COLLECTION_NAME, stats.id || "", data);
      } catch (error) {
        console.error("Error updating PlayerMatchStats:", error);
      }
    } else {
      throw new Error(`PlayerMatchStats not found for matchId: ${matchId}`);
    }
  }

  static async delete(matchId: string): Promise<void> {
    const stats = await this.getByMatchId(matchId);
    if (stats) {
      await firestoreService.delete(COLLECTION_NAME, stats.id || "");
    } else {
      throw new Error(`PlayerMatchStats not found for matchId: ${matchId}`);
    }
  }

  toObject(): playerMatchStats {
    return {
      matchId: this.matchId,
      playerMatchStats: this.playerMatchStats,
    };
  }
}
