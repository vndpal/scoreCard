import { firestoreService } from "../services/firestore";
import { team } from "../../types/team";

const COLLECTION_NAME = "teams";

export class Team implements team {
  id: string;
  teamName: string;
  teamInitials: string;

  constructor(id: string, data: team) {
    this.id = id;
    this.teamName = data.teamName;
    this.teamInitials = data.teamInitials;
  }

  static async create(data: Omit<team, "id">): Promise<Team> {
    const id = await firestoreService.createWithAutoId(COLLECTION_NAME, data);
    return new Team(id, { id, ...data });
  }

  static async getById(id: string): Promise<Team | null> {
    console.log("id", id);
    const data = await firestoreService.get<team>(COLLECTION_NAME, id);
    return data ? new Team(id, data) : null;
  }

  static async getAll(): Promise<Team[]> {
    const teams = await firestoreService.getAll<team>(COLLECTION_NAME);
    return teams.map((team) => new Team(team.id ?? "", team));
  }

  async update(data: Partial<team>): Promise<void> {
    await firestoreService.update(COLLECTION_NAME, this.id, data);
    Object.assign(this, data);
  }

  async delete(): Promise<void> {
    await firestoreService.delete(COLLECTION_NAME, this.id);
  }

  static async findByInitials(name: string): Promise<Team[]> {
    const teams = await firestoreService.query<team & { id: string }>(
      COLLECTION_NAME,
      [
        {
          field: "teamInitials",
          operator: "==",
          value: name,
        },
      ]
    );
    return teams.map((team) => new Team(team.id, team));
  }

  toObject(): team & { id: string } {
    return {
      id: this.id,
      teamName: this.teamName,
      teamInitials: this.teamInitials,
    };
  }
}