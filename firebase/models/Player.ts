import { firestoreService } from "../services/firestore";
import { player } from "../../types/player";
import { v4 as uuidv4 } from "uuid";

const COLLECTION_NAME = "players";

export class Player implements player {
  id: string;
  name: string;
  clubId: string;

  constructor(id: string, data: player) {
    this.id = id;
    this.name = data.name;
    this.clubId = data.clubId;
  }

  static async create(data: Omit<player, "id">): Promise<Player> {
    const id = await firestoreService.createWithAutoId(COLLECTION_NAME, data);
    return new Player(id, { id, name: data.name, clubId: data.clubId });
  }

  static async getById(id: string): Promise<Player | null> {
    const data = await firestoreService.get<player>(COLLECTION_NAME, id);
    return data ? new Player(id, data) : null;
  }

  static async getAll(): Promise<Player[]> {
    const players = await firestoreService.getAll<player>(COLLECTION_NAME);
    return players.map((player) => new Player(player.id, player));
  }

  static async getAllFromClub(clubId: string): Promise<Player[]> {
    const players = await firestoreService.query<player>(COLLECTION_NAME, [
      {
        field: "clubId",
        operator: "==",
        value: clubId,
      },
    ]);
    return players.map((player) => new Player(player.id, player));
  }

  static async getAllFromCache(): Promise<Player[]> {
    const players = await firestoreService.getAllFromCache<player>(
      COLLECTION_NAME
    );
    return players.map((player) => new Player(player.id, player));
  }

  static async update(id: string, data: Partial<player>): Promise<void> {
    await firestoreService.update(COLLECTION_NAME, id, data);
  }

  static async delete(id: string): Promise<void> {
    await firestoreService.delete(COLLECTION_NAME, id);
  }

  static async findByName(name: string): Promise<Player[]> {
    const players = await firestoreService.query<player & { id: string }>(
      COLLECTION_NAME,
      [
        {
          field: "name",
          operator: "==",
          value: name,
        },
      ]
    );
    return players.map((player) => new Player(player.id, player));
  }

  toObject(): player & { id: string } {
    return {
      id: this.id,
      name: this.name,
      clubId: this.clubId,
    };
  }
}
