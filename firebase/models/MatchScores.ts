import { firestoreService } from "../services/firestore";
import { scorePerBall } from "../../types/scorePerBall";
import { scorePerOver } from "@/types/scorePerOver";
import { MatchScoresData } from "@/types/matchScores";

const COLLECTION_NAME = "matchScores";
const BALLS_SUBCOLLECTION = "balls";

export class MatchScore implements MatchScoresData {
  matchId: string;
  teamId: string;
  clubId: string;
  tournamentId: string;
  inningNumber: number;
  overNumber: number;
  overSummary: scorePerOver;

  constructor(data: MatchScoresData) {
    this.matchId = data.matchId;
    this.teamId = data.teamId;
    this.clubId = data.clubId;
    this.tournamentId = data.tournamentId;
    this.inningNumber = data.inningNumber;
    this.overNumber = data.overNumber;
    this.overSummary = data.overSummary;
  }

  static async create(data: MatchScoresData): Promise<MatchScore> {
    const id = `${data.matchId}_${data.teamId}_${data.inningNumber}_${data.overNumber}`;
    await firestoreService.create(COLLECTION_NAME, id, {
      ...data,
      overSummary: [],
    });
    return new MatchScore(data);
  }

  static async getByMatchIdInningNumber(
    matchId: string,
    inningNumber: number
  ): Promise<MatchScore[] | null> {
    const data = await firestoreService.query<MatchScoresData>(
      COLLECTION_NAME,
      [
        {
          field: "matchId",
          operator: "==",
          value: matchId,
        },
        {
          field: "inningNumber",
          operator: "==",
          value: inningNumber,
        },
      ]
    );

    if (!data) return null;

    const matchScoresWithBalls = await Promise.all(
      data.map(async (score) => {
        const ballScores = await MatchScore.getBallScores(
          score.matchId,
          score.teamId,
          score.inningNumber,
          score.overNumber
        );
        return new MatchScore({
          ...score,
          overSummary: ballScores,
        });
      })
    );
    // Without an explicit orderBy, Firestore returns docs in doc-ID string
    // order, which puts over 10+ between overs 1 and 2. Sort numerically,
    // newest over first — callers rely on [0] being the latest over.
    return matchScoresWithBalls.sort((a, b) => b.overNumber - a.overNumber);
  }

  static async getById(id: string): Promise<MatchScore | null> {
    const data = await firestoreService.get<any>(COLLECTION_NAME, id);
    if (data) {
      return new MatchScore({
        ...data,
      });
    }
    return null;
  }

  static async update(
    matchId: string,
    teamId: string,
    inningNumber: number,
    overNumber: number,
    data: Partial<MatchScore>
  ): Promise<void> {
    const id = `${matchId}_${teamId}_${inningNumber}_${overNumber}`;
    await firestoreService.update(COLLECTION_NAME, id, {
      ...data,
    });
  }

  static async delete(
    matchId: string,
    teamId: string,
    inningNumber: number,
    overNumber: number
  ): Promise<void> {
    const id = `${matchId}_${teamId}_${inningNumber}_${overNumber}`;
    await firestoreService.delete(COLLECTION_NAME, id);
  }

  toObject(): any {
    return {
      ...this,
    };
  }

  static async addBallScore(
    matchId: string,
    teamId: string,
    inningNumber: number,
    overNumber: number,
    ballNumber: number,
    ballData: scorePerBall
  ): Promise<void> {
    const overId = `${matchId}_${teamId}_${inningNumber}_${overNumber}`;
    const ballId = `ball_${ballNumber}`;

    // Convert player objects to a Firestore-friendly format
    const firestoreBallData = {
      ...ballData,
      strikerBatter: ballData.strikerBatter
        ? {
            id: ballData.strikerBatter.id,
            name: ballData.strikerBatter.name,
          }
        : null,
      nonStrikerBatter: ballData.nonStrikerBatter
        ? {
            id: ballData.nonStrikerBatter.id,
            name: ballData.nonStrikerBatter.name,
          }
        : null,
      bowler: ballData.bowler
        ? {
            id: ballData.bowler.id,
            name: ballData.bowler.name,
          }
        : null,
      // Dismissal fields are absent on most balls. Firestore rejects
      // `undefined`, so coerce to null (same convention as the players above).
      outType: ballData.outType ?? null,
      outBatterId: ballData.outBatterId ?? null,
      fielder: ballData.fielder
        ? { id: ballData.fielder.id, name: ballData.fielder.name }
        : null,
    };

    await firestoreService.create(
      `${COLLECTION_NAME}/${overId}/${BALLS_SUBCOLLECTION}`,
      ballId,
      firestoreBallData
    );
  }

  static async getBallScores(
    matchId: string,
    teamId: string,
    inningNumber: number,
    overNumber: number
  ): Promise<scorePerBall[]> {
    const overId = `${matchId}_${teamId}_${inningNumber}_${overNumber}`;
    const ballsData = await firestoreService.query<any>(
      `${COLLECTION_NAME}/${overId}/${BALLS_SUBCOLLECTION}`,
      []
    );

    // Ball docs are named ball_1, ball_2, … and string ordering misplaces
    // ball_10+ (it sorts before ball_2), so sort by the numeric suffix,
    // newest ball first — callers rely on [0] being the latest delivery.
    const ballNumberOf = (id: string) =>
      parseInt(String(id).split("_")[1], 10) || 0;

    return ballsData
      .map((ball) => ({
        ...ball,
        strikerBatter: ball.strikerBatter
          ? { id: ball.strikerBatter.id, name: ball.strikerBatter.name }
          : undefined,
        nonStrikerBatter: ball.nonStrikerBatter
          ? { id: ball.nonStrikerBatter.id, name: ball.nonStrikerBatter.name }
          : undefined,
        bowler: ball.bowler
          ? { id: ball.bowler.id, name: ball.bowler.name }
          : undefined,
      }))
      .sort((a, b) => ballNumberOf(b.id) - ballNumberOf(a.id));
  }

  static async updateBallScore(
    matchId: string,
    teamId: string,
    inningNumber: number,
    overNumber: number,
    ballNumber: number,
    ballData: Partial<scorePerBall>
  ): Promise<void> {
    const overId = `${matchId}_${teamId}_${inningNumber}_${overNumber}`;
    const ballId = `ball_${ballNumber}`;
    await firestoreService.update(
      `${COLLECTION_NAME}/${overId}/${BALLS_SUBCOLLECTION}`,
      ballId,
      ballData
    );
  }

  static async deleteBallScore(
    matchId: string,
    teamId: string,
    inningNumber: number,
    overNumber: number,
    ballNumber: number
  ): Promise<void> {
    const overId = `${matchId}_${teamId}_${inningNumber}_${overNumber}`;
    const ballId = `ball_${ballNumber}`;
    await firestoreService.delete(
      `${COLLECTION_NAME}/${overId}/${BALLS_SUBCOLLECTION}`,
      ballId
    );
  }
}
