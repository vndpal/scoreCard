import { firestoreService } from "../services/firestore";
import { scorePerBall } from "../../types/scorePerBall";
import { scorePerOver } from "@/types/scorePerOver";

const COLLECTION_NAME = "matchScores";
const BALLS_SUBCOLLECTION = "balls";

export type MatchScoresData = {
  matchId: string;
  teamId: string;
  inningNumber: number;
  overNumber: number;
  overSummary: scorePerOver;
};

export class MatchScore implements MatchScoresData {
  matchId: string;
  teamId: string;
  inningNumber: number;
  overNumber: number;
  overSummary: scorePerOver;

  constructor(data: MatchScoresData) {
    this.matchId = data.matchId;
    this.teamId = data.teamId;
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
    return matchScoresWithBalls.reverse();
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
    const ballsData = await firestoreService.getAllOrderby<any>(
      `${COLLECTION_NAME}/${overId}/${BALLS_SUBCOLLECTION}`,
      "__name__",
      "asc"
    );

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
      .reverse();
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
