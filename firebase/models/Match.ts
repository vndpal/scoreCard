import { firestoreService } from "../services/firestore";
import { match } from "../../types/match";
import { matchResult } from "@/types/matchResult";
import { currentTotalScore } from "@/types/currentTotalScore";
import {
  FirebaseFirestoreTypes,
  Timestamp,
} from "@react-native-firebase/firestore";

const COLLECTION_NAME = "matches";

export class Match implements Omit<match, "team1score" | "team2score"> {
  matchId: string;
  team1: string;
  team2: string;
  team1Fullname: string;
  team2Fullname: string;
  tossWin: "team1" | "team2";
  choose: "batting" | "bowling";
  winner?: "team1" | "team2";
  overs: number;
  status: matchResult;
  isFirstInning: boolean;
  wickets?: number;
  startDateTime: Timestamp;
  endDateTime?: Timestamp;
  quickMatch: boolean;
  manOfTheMatch: string;
  currentScore: {
    team1: currentTotalScore;
    team2: currentTotalScore;
  };
  clubId: string;

  constructor(matchId: string, data: match) {
    this.matchId = matchId;
    this.team1 = data.team1;
    this.team2 = data.team2;
    this.team1Fullname = data.team1Fullname;
    this.team2Fullname = data.team2Fullname;
    this.tossWin = data.tossWin;
    this.choose = data.choose;
    this.overs = data.overs;
    this.status = data.status;
    this.isFirstInning = data.isFirstInning;
    this.startDateTime = data.startDateTime;
    this.endDateTime = data.endDateTime;
    this.quickMatch = data.quickMatch;
    this.manOfTheMatch = data.manOfTheMatch;
    this.currentScore = data.currentScore;
    this.clubId = data.clubId;
    Object.assign(this, data);
  }

  static async create(data: Omit<match, "matchId">): Promise<match> {
    const matchId = await firestoreService.createWithAutoId(
      COLLECTION_NAME,
      data
    );
    return new Match(matchId, { matchId, ...data });
  }

  static async getById(matchId: string): Promise<Match | null> {
    const data = await firestoreService.get<match>(COLLECTION_NAME, matchId);
    return data ? new Match(matchId, data) : null;
  }

  static async getLatestMatch(clubId: string): Promise<match | null> {
    const latestMatch = await firestoreService.getLatest<
      match & { id: string }
    >(
      COLLECTION_NAME,
      [{ field: "clubId", operator: "==", value: clubId }],
      "startDateTime",
      "desc"
    );
    return latestMatch ? { ...latestMatch, matchId: latestMatch.id } : null;
  }

  static async getAll(): Promise<match[]> {
    const matches = await firestoreService.getAll<match & { id: string }>(
      COLLECTION_NAME
    );
    return matches.map((match) => ({ ...match, matchId: match.id }));
  }

  static async getAllOrderby(
    clubId: string,
    fieldItem: string,
    direction: "asc" | "desc"
  ): Promise<match[]> {
    const matches = await firestoreService.getAllOrderby<
      match & { id: string }
    >(COLLECTION_NAME, fieldItem, direction, [
      { field: "clubId", operator: "==", value: clubId },
    ]);
    return matches.map((match) => ({
      ...match,
      matchId: match.id,
    }));
  }

  static async update(matchId: string, data: Partial<match>): Promise<void> {
    await firestoreService.update(COLLECTION_NAME, matchId, data);
    Object.assign(this, data);
  }

  static async delete(matchId: string): Promise<void> {
    await firestoreService.delete(COLLECTION_NAME, matchId);
  }

  static async findByTeam(teamName: string): Promise<Match[]> {
    const matches = await firestoreService.query<match>(COLLECTION_NAME, [
      {
        field: "team1",
        operator: "==",
        value: teamName,
      },
    ]);
    const matches2 = await firestoreService.query<match>(COLLECTION_NAME, [
      {
        field: "team2",
        operator: "==",
        value: teamName,
      },
    ]);
    return [...matches, ...matches2].map(
      (match) => new Match(match.matchId, match)
    );
  }

  toObject(): Omit<match, "team1score" | "team2score"> {
    return { ...this };
  }
}
