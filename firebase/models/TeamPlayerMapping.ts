import { firestoreService } from "../services/firestore";
import { teamPlayerMapping } from "../../types/teamPlayerMapping";

const COLLECTION_NAME = "teamPlayerMapping";

export class TeamPlayerMapping {
  constructor(public teamName: string, public players: string[]) {}

  static async create(
    teamName: string,
    players: string[]
  ): Promise<TeamPlayerMapping> {
    await firestoreService.create(COLLECTION_NAME, teamName, { players });
    return new TeamPlayerMapping(teamName, players);
  }

  static async getByTeamName(
    teamName: string
  ): Promise<TeamPlayerMapping | null> {
    const data = await firestoreService.get<{ players: string[] }>(
      COLLECTION_NAME,
      teamName
    );
    return data ? new TeamPlayerMapping(teamName, data.players) : null;
  }

  static async getPlayersByTeamName(teamName: string): Promise<string[]> {
    const data = await firestoreService.get<{ players: string[] }>(
      COLLECTION_NAME,
      teamName
    );
    return data ? data.players : [];
  }

  static async getAll(): Promise<TeamPlayerMapping[]> {
    const mappings = await firestoreService.getAll<{
      id: string;
      players: string[];
    }>(COLLECTION_NAME);
    return mappings.map(
      ({ id, players }) => new TeamPlayerMapping(id, players)
    );
  }

  async update(players: string[]): Promise<void> {
    await firestoreService.update(COLLECTION_NAME, this.teamName, { players });
    this.players = players;
  }

  async delete(): Promise<void> {
    await firestoreService.delete(COLLECTION_NAME, this.teamName);
  }

  async addPlayer(playerId: string): Promise<void> {
    if (!this.players.includes(playerId)) {
      this.players.push(playerId);
      await this.update(this.players);
    }
  }

  async removePlayer(playerId: string): Promise<void> {
    const index = this.players.indexOf(playerId);
    if (index !== -1) {
      this.players.splice(index, 1);
      await this.update(this.players);
    }
  }

  toObject(): teamPlayerMapping {
    return {
      [this.teamName]: this.players,
    };
  }
}
