import { firestoreService } from "../services/firestore";
import { team } from "../../types/team";

const COLLECTION_NAME = "teams";

export class Team implements team {
  id: string;
  teamName: string;
  teamInitials: string;
  clubId: string;

  constructor(id: string, data: team) {
    this.id = id;
    this.teamName = data.teamName;
    this.teamInitials = data.teamInitials;
    this.clubId = data.clubId;
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

  static async getAllByClubId(clubId: string): Promise<Team[]> {
    const teams = await firestoreService.query<team>(COLLECTION_NAME, [
      { field: "clubId", operator: "==", value: clubId },
    ]);
    return teams.map((team) => new Team(team.id ?? "", team));
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

  static async findByInitials(name: string, clubId: string): Promise<Team[]> {
    const teams = await firestoreService.query<team & { id: string }>(
      COLLECTION_NAME,
      [
        {
          field: "teamInitials",
          operator: "==",
          value: name,
        },
        {
          field: "clubId",
          operator: "==",
          value: clubId,
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
      clubId: this.clubId,
    };
  }
}
