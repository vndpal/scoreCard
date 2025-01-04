import { firestoreService } from "../services/firestore";
import { teamPlayerMapping } from "../../types/teamPlayerMapping";
import { player } from "@/types/player";

const COLLECTION_NAME = "teamPlayerMapping";

export class TeamPlayerMapping {
  constructor(public teamName: string, public players: player[]) {}

  static async create(
    teamName: string,
    players: player[]
  ): Promise<TeamPlayerMapping> {
    await firestoreService.create(COLLECTION_NAME, teamName, { players });
    return new TeamPlayerMapping(teamName, players);
  }

  static async getByTeamName(
    teamName: string
  ): Promise<TeamPlayerMapping | null> {
    const data = await firestoreService.get<{ players: player[] }>(
      COLLECTION_NAME,
      teamName
    );
    return data ? new TeamPlayerMapping(teamName, data.players) : null;
  }

  static async getPlayersByTeamName(teamName: string): Promise<player[]> {
    const data = await firestoreService.get<{ players: player[] }>(
      COLLECTION_NAME,
      teamName
    );
    return data ? data.players : [];
  }

  static async getAll(): Promise<TeamPlayerMapping[]> {
    const mappings = await firestoreService.getAll<{
      id: string;
      players: player[];
    }>(COLLECTION_NAME);
    return mappings.map(
      ({ id, players }) => new TeamPlayerMapping(id, players)
    );
  }

  async update(players: player[]): Promise<void> {
    await firestoreService.update(COLLECTION_NAME, this.teamName, { players });
    this.players = players;
  }

  async delete(): Promise<void> {
    await firestoreService.delete(COLLECTION_NAME, this.teamName);
  }

  toObject(): teamPlayerMapping {
    return {
      [this.teamName]: this.players,
    };
  }
}
