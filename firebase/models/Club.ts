import { firestoreService } from "../services/firestore";

const COLLECTION_NAME = "clubs";

export class Club implements Club {
  name: string;
  id: string;

  constructor(name: string, id: string) {
    this.name = name;
    this.id = id;
  }

  static async create(name: string): Promise<Club> {
    const id = await firestoreService.createWithAutoId(COLLECTION_NAME, {
      name,
    });
    return new Club(name, id);
  }

  static async getAll(): Promise<Club[]> {
    const clubs = await firestoreService.getAll<Club>(COLLECTION_NAME);
    return clubs.map((club) => new Club(club.name, club.id));
  }

  static async getByName(name: string): Promise<Club | null> {
    const clubs = await firestoreService.query<Club>(COLLECTION_NAME, [
      { field: "name", operator: "==", value: name },
    ]);
    return clubs.length > 0 ? new Club(clubs[0].name, clubs[0].id) : null;
  }

  static async delete(name: string): Promise<void> {
    await firestoreService.delete(COLLECTION_NAME, name);
  }

  static async update(name: string, club: Club): Promise<void> {
    await firestoreService.update(COLLECTION_NAME, name, club);
  }

  static async isClubExists(name: string): Promise<boolean> {
    const clubs = await firestoreService.query<Club>(COLLECTION_NAME, [
      { field: "name", operator: "==", value: name },
    ]);
    return clubs.length > 0;
  }
}
