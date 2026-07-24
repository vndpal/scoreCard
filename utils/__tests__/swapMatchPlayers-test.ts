import { playerStats } from "@/types/playerStats";
import { scorePerBall } from "@/types/scorePerBall";
import { scorePerInning } from "@/types/scorePerInnig";
import { rebuildPlayerMatchStats } from "@/utils/rebuildPlayerMatchStats";
import {
  applyDelta,
  BallDoc,
  swapBallRefs,
  SwapMode,
} from "@/utils/swapMatchPlayers.core";

// ---- fixtures -------------------------------------------------------------

const mkStat = (playerId: string, name: string, team: string): playerStats => ({
  playerId,
  name,
  team,
  runs: 0,
  ballsFaced: 0,
  fours: 0,
  sixes: 0,
  strikeRate: 0,
  average: 0,
  isOut: false,
  wickets: 0,
  overs: 0,
  ballsBowled: 0,
  extras: 0,
  runsConceded: 0,
  foursConceded: 0,
  sixesConceded: 0,
  maidens: 0,
  bowlingEconomy: 0,
  dotBalls: 0,
  catches: 0,
  stumpings: 0,
  runOuts: 0,
});

const ref = (id: string, name: string) => ({ id, name, clubId: "club" } as any);

const mkBall = (
  id: string,
  run: number,
  striker: string,
  nonStriker: string,
  bowler: string,
  extra: Partial<scorePerBall> = {}
): BallDoc => ({
  id,
  run,
  extra: 0,
  totalRun: run,
  isWicket: false,
  isNoBall: false,
  isWideBall: false,
  isOverEnd: false,
  strikerBatter: ref(striker, striker.toUpperCase()),
  nonStrikerBatter: ref(nonStriker, nonStriker.toUpperCase()),
  bowler: ref(bowler, bowler.toUpperCase()),
  ...extra,
});

// A=a, B=b bat for T1; X=x, Y=y bowl for T2; C=c never appears.
const baseStats = (): playerStats[] => [
  mkStat("a", "A", "T1"),
  mkStat("b", "B", "T1"),
  mkStat("c", "C", "T1"),
  mkStat("x", "X", "T2"),
  mkStat("y", "Y", "T2"),
];

// Over 1 bowled by X, over 2 bowled by Y. Order within arrays is irrelevant to
// rebuild (it aggregates), so oldest-first reads naturally here.
const buildInning = (): scorePerInning =>
  [
    [
      mkBall("ball_1", 4, "a", "b", "x"),
      mkBall("ball_2", 0, "a", "b", "x"),
      mkBall("ball_3", 6, "b", "a", "x", { isOverEnd: true }),
    ],
    [
      mkBall("ball_1", 2, "b", "a", "y"),
      mkBall("ball_2", 0, "a", "b", "y"),
      mkBall("ball_3", 0, "a", "b", "y", {
        isWicket: true,
        outType: "bowled",
        outBatterId: "a",
        isOverEnd: true,
      }),
    ],
  ] as scorePerInning;

const swapInning = (
  inning: scorePerInning,
  mode: SwapMode,
  aId: string,
  bId: string,
  aName: string,
  bName: string
): scorePerInning =>
  inning.map((over) =>
    over.map((original) => {
      const ball: BallDoc = { ...(original as BallDoc) };
      swapBallRefs(ball, mode, aId, bId, aName, bName);
      return ball as scorePerBall;
    })
  ) as scorePerInning;

const byId = (stats: playerStats[], id: string) =>
  stats.find((s) => s.playerId === id)!;

// ---- batsman swap ---------------------------------------------------------

describe("batsman swap", () => {
  const before = rebuildPlayerMatchStats(baseStats(), buildInning(), []);
  const swapped = swapInning(buildInning(), "batsman", "a", "b", "A", "B");
  const after = rebuildPlayerMatchStats(baseStats(), swapped, []);

  it("exchanges the two batsmen's batting figures", () => {
    const battingFields: (keyof playerStats)[] = [
      "runs",
      "ballsFaced",
      "fours",
      "sixes",
      "isOut",
    ];
    battingFields.forEach((f) => {
      expect(byId(after, "a")[f]).toEqual(byId(before, "b")[f]);
      expect(byId(after, "b")[f]).toEqual(byId(before, "a")[f]);
    });
    // Sanity: the scenario really did give them different batting lines.
    expect(byId(before, "a").runs).not.toEqual(byId(before, "b").runs);
    // A was out before the swap; that dismissal moves to B, so afterwards B is
    // out and A (who inherits B's not-out line) is not.
    expect(byId(before, "a").isOut).toBe(true);
    expect(byId(after, "a").isOut).toBe(false);
    expect(byId(after, "b").isOut).toBe(true);
  });

  it("leaves the bowlers untouched by a batsman swap", () => {
    ["x", "y"].forEach((id) => {
      expect(byId(after, id).runsConceded).toEqual(byId(before, id).runsConceded);
      expect(byId(after, id).wickets).toEqual(byId(before, id).wickets);
      expect(byId(after, id).overs).toEqual(byId(before, id).overs);
    });
  });

  it("leaves an uninvolved player at zero", () => {
    expect(byId(after, "c").runs).toBe(0);
    expect(byId(after, "c").ballsFaced).toBe(0);
    expect(byId(after, "c").wickets).toBe(0);
  });
});

// ---- bowler swap ----------------------------------------------------------

describe("bowler swap", () => {
  const before = rebuildPlayerMatchStats(baseStats(), buildInning(), []);
  const swapped = swapInning(buildInning(), "bowler", "x", "y", "X", "Y");
  const after = rebuildPlayerMatchStats(baseStats(), swapped, []);

  it("exchanges the two bowlers' bowling figures", () => {
    const bowlingFields: (keyof playerStats)[] = [
      "runsConceded",
      "wickets",
      "overs",
      "dotBalls",
      "foursConceded",
      "sixesConceded",
    ];
    bowlingFields.forEach((f) => {
      expect(byId(after, "x")[f]).toEqual(byId(before, "y")[f]);
      expect(byId(after, "y")[f]).toEqual(byId(before, "x")[f]);
    });
    // Sanity: X and Y really did have different lines.
    expect(byId(before, "x").runsConceded).not.toEqual(
      byId(before, "y").runsConceded
    );
    // The wicket followed the bowler: after the swap X (was wicketless) has it.
    expect(byId(after, "x").wickets).toBe(1);
    expect(byId(after, "y").wickets).toBe(0);
  });

  it("leaves the batsmen untouched by a bowler swap", () => {
    ["a", "b"].forEach((id) => {
      expect(byId(after, id).runs).toEqual(byId(before, id).runs);
      expect(byId(after, id).ballsFaced).toEqual(byId(before, id).ballsFaced);
      expect(byId(after, id).isOut).toEqual(byId(before, id).isOut);
    });
  });
});

// ---- aggregate delta ------------------------------------------------------

describe("applyDelta", () => {
  it("moves one match's contribution from old to new figures", () => {
    const agg: Record<string, any> = {
      ...mkStat("a", "A", "T1"),
      matches: 5,
      innings: 5,
      notOuts: 1,
      runs: 100,
      ballsFaced: 50,
      overs: 10,
      ballsBowled: 3,
      runsConceded: 80,
      wickets: 5,
    };

    const oldM = { ...mkStat("a", "A", "T1"), runs: 8, ballsFaced: 2 };
    const newM = {
      ...mkStat("a", "A", "T1"),
      runs: 4,
      ballsFaced: 4,
      isOut: true,
    };

    applyDelta(agg, oldM, newM);

    expect(agg.runs).toBe(96); // 100 - 8 + 4
    expect(agg.ballsFaced).toBe(52); // 50 - 2 + 4
    expect(agg.innings).toBe(5); // both faced balls -> unchanged
    expect(agg.notOuts).toBe(0); // was not-out (1) -> now out (0)
    expect(agg.strikeRate).toBeCloseTo((96 / 52) * 100);
  });
});
