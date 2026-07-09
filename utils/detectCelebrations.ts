import { scorePerBall } from "@/types/scorePerBall";
import { scorePerOver } from "@/types/scorePerOver";
import { scorePerInning } from "@/types/scorePerInnig";
import {
  CelebrationEvent,
  CelebrationType,
  CELEBRATION_META,
} from "@/types/celebration";

// Everything the detector needs about the just-recorded ball. Derived in
// handleSubmit; all fields are plain data so this stays a pure function.
export type DetectCelebrationsInput = {
  scoreThisBall: scorePerBall;
  // Current over including this ball, newest-first (index 0 == this ball).
  scoreThisOver: scorePerOver;
  // Current innings: all overs newest-first, each over newest-first. Used for
  // the hat-trick lookback across the strike/over change.
  inningsScore: scorePerInning;
  // Striker run totals around this ball. Undefined in quick matches (no
  // per-player stats), which correctly disables batting milestones.
  strikerRunsBefore?: number;
  strikerRunsAfter?: number;
  strikerName?: string;
  strikerBalls?: number;
  strikerFours?: number;
  strikerSixes?: number;
  bowlerId?: string;
  bowlerName?: string;
  // Batting team total runs before/after this ball.
  teamBefore: number;
  teamAfter: number;
  // True when this ball completed the over legally.
  isOverEnd: boolean;
};

const uid = (type: CelebrationType) => `${type}-${Date.now()}-${Math.random()}`;

const make = (
  type: CelebrationType,
  title: string,
  subtitle?: string
): CelebrationEvent => ({
  id: uid(type),
  type,
  title,
  subtitle,
  emoji: CELEBRATION_META[type].emoji,
});

// A wicket credited to the bowler (run-outs are never the bowler's).
const isBowlerWicket = (ball: scorePerBall) =>
  ball.isWicket && ball.outType !== "runout";

// A delivery that counts as a legal ball (wides/no-balls are re-bowled).
const isLegalBall = (ball: scorePerBall) => !ball.isWideBall && !ball.isNoBall;

const battingSubtitle = (input: DetectCelebrationsInput): string | undefined => {
  if (!input.strikerName) return undefined;
  const parts: string[] = [];
  if (typeof input.strikerBalls === "number") {
    parts.push(`${input.strikerBalls} ball${input.strikerBalls === 1 ? "" : "s"}`);
  }
  const fours = input.strikerFours ?? 0;
  const sixes = input.strikerSixes ?? 0;
  const bp: string[] = [];
  if (fours) bp.push(`${fours}×4`);
  if (sixes) bp.push(`${sixes}×6`);
  if (bp.length) parts.push(bp.join(" "));
  const tail = parts.length ? ` · ${parts.join(" · ")}` : "";
  return `${input.strikerName}${tail}`;
};

/**
 * Inspect the just-recorded ball and return any milestones it triggered.
 * Pure and cheap (bounded work) so it is safe to call on every delivery.
 *
 * Milestones: fifty, century, hat-trick, maiden over, team reaching 100,
 * and six sixes in an over.
 */
export function detectCelebrations(
  input: DetectCelebrationsInput
): CelebrationEvent[] {
  const events: CelebrationEvent[] = [];
  const { scoreThisBall, scoreThisOver, isOverEnd } = input;

  // --- Batting: fifty / century (striker crossing the threshold) ---
  const { strikerRunsBefore, strikerRunsAfter } = input;
  if (
    typeof strikerRunsBefore === "number" &&
    typeof strikerRunsAfter === "number"
  ) {
    if (strikerRunsBefore < 100 && strikerRunsAfter >= 100) {
      events.push(make("century", "Century!", battingSubtitle(input)));
    } else if (strikerRunsBefore < 50 && strikerRunsAfter >= 50) {
      events.push(make("fifty", "Fifty!", battingSubtitle(input)));
    }
  }

  // --- Bowling: hat-trick (3 consecutive legal deliveries by this bowler,
  // all bowler-credited wickets — spanning the over gap if needed). ---
  if (isBowlerWicket(scoreThisBall) && input.bowlerId) {
    const bowlerLegalBalls: scorePerBall[] = [];
    // inningsScore is newest-first (overs and balls), so this walk yields the
    // bowler's most recent legal deliveries first. Stop as soon as we have 3.
    outer: for (const over of input.inningsScore) {
      for (const ball of over) {
        if (ball.bowler?.id === input.bowlerId && isLegalBall(ball)) {
          bowlerLegalBalls.push(ball);
          if (bowlerLegalBalls.length === 3) break outer;
        }
      }
    }
    if (
      bowlerLegalBalls.length === 3 &&
      bowlerLegalBalls.every(isBowlerWicket)
    ) {
      const subtitle = input.bowlerName
        ? `${input.bowlerName} · 3 in 3`
        : undefined;
      events.push(make("hatTrick", "Hat-trick!", subtitle));
    }
  }

  // --- Team: total crosses 100 ---
  if (input.teamBefore < 100 && input.teamAfter >= 100) {
    events.push(make("team100", "Team 100!", "100 up"));
  }

  // --- Over-based milestones (only meaningful once the over is complete) ---
  if (isOverEnd && scoreThisOver.length > 0) {
    // Six sixes: exactly 6 balls in the over and every one hit for six.
    const sixSixes =
      scoreThisOver.length === 6 &&
      scoreThisOver.every((ball) => ball.run === 6 && isLegalBall(ball));
    if (sixSixes) {
      const subtitle = input.bowlerName
        ? `36 off ${input.bowlerName}'s over`
        : "36 runs in the over";
      events.push(make("sixSixes", "Six Sixes!", subtitle));
    } else {
      // Maiden over: no runs conceded on any ball (any extra breaks it).
      const maiden = scoreThisOver.every((ball) => ball.totalRun === 0);
      if (maiden) {
        const subtitle = input.bowlerName
          ? `${input.bowlerName} · no runs`
          : "No runs off the over";
        events.push(make("maiden", "Maiden Over!", subtitle));
      }
    }
  }

  return events;
}
