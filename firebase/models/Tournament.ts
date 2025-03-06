import { Timestamp } from "@react-native-firebase/firestore";
import { tournament } from "@/types/tournament";
import { firestoreService } from "../services/firestore";

const COLLECTION_NAME = "tournaments";
export class Tournament implements tournament {
  id: string;
  name: string;
  date: Timestamp;
  clubId: string;
  status: "upcoming" | "ongoing" | "completed";

  constructor(id: string, data: tournament) {
    this.id = id;
    this.name = data.name;
    this.date = data.date;
    this.clubId = data.clubId;
    this.status = data.status;
  }

  static async create(data: Omit<tournament, "id">): Promise<Tournament> {
    const id = await firestoreService.createWithAutoId(COLLECTION_NAME, data);
    return new Tournament(id, { id, ...data });
  }

  static async getById(id: string): Promise<Tournament | null> {
    const data = await firestoreService.get<tournament>(COLLECTION_NAME, id);
    return data ? new Tournament(id, data) : null;
  }

  static async getAllByClubId (clubId: string): Promise<Tournament[]> {
    const data = await firestoreService.query<tournament>(COLLECTION_NAME, [
      { field: "clubId", operator: "==", value: clubId },
    ]);
    return data.map((doc: tournament) => new Tournament(doc.id, doc));
  }

  static async getByStatus(
    status: "upcoming" | "ongoing" | "completed",
    clubId: string
  ): Promise<Tournament[]> {
    const data = await firestoreService.query<tournament>(COLLECTION_NAME, [
      { field: "status", operator: "==", value: status },
      { field: "clubId", operator: "==", value: clubId },
    ]);
    return data.map((doc: tournament) => new Tournament(doc.id, doc));
  }

  static async update(id: string, data: Partial<tournament>): Promise<void> {
    await firestoreService.update(COLLECTION_NAME, id, data);
  }

  static async delete(id: string): Promise<void> {
    await firestoreService.delete(COLLECTION_NAME, id);
  }
}
