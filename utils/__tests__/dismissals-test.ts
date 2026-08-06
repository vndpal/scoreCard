import { buildDismissalMap, makeGetDismissalStatus } from "@/utils/dismissals";

// Balls carry far more fields than the dismissal logic reads; only the ones it
// touches are set here.
const ball = (over: any) => over;

const wicketBall = (extra: any) => ({
  run: 0,
  extra: 0,
  totalRun: 0,
  isWicket: true,
  isNoBall: false,
  isWideBall: false,
  isOverEnd: false,
  ...extra,
});

const dot = {
  run: 0,
  extra: 0,
  totalRun: 0,
  isWicket: false,
  isNoBall: false,
  isWideBall: false,
  isOverEnd: false,
  strikerBatter: { id: "p1", name: "Amit" },
  nonStrikerBatter: { id: "p2", name: "Bhanu" },
  bowler: { id: "p9", name: "Jones" },
};

describe("buildDismissalMap", () => {
  it("returns an empty map when nothing is passed", () => {
    expect(buildDismissalMap().size).toBe(0);
    expect(buildDismissalMap(null, undefined).size).toBe(0);
  });

  it("ignores balls that are not wickets", () => {
    expect(buildDismissalMap([ball([dot])]).size).toBe(0);
  });

  it("credits the explicit out batter, not the striker", () => {
    // Run-out of the non-striker: the striker faced the ball but the other
    // batter is the one who is out.
    const map = buildDismissalMap([
      ball([
        wicketBall({
          strikerBatter: { id: "p1", name: "Amit" },
          nonStrikerBatter: { id: "p2", name: "Bhanu" },
          bowler: { id: "p9", name: "Jones" },
          outType: "runout",
          outBatterId: "p2",
          fielder: { id: "p8", name: "Smith" },
        }),
      ]),
    ]);
    expect(map.has("p2")).toBe(true);
    expect(map.has("p1")).toBe(false);
  });

  it("falls back to the striker on older balls with no outBatterId", () => {
    const map = buildDismissalMap([
      ball([
        wicketBall({
          strikerBatter: { id: "p1", name: "Amit" },
          bowler: { id: "p9", name: "Jones" },
          outType: "bowled",
        }),
      ]),
    ]);
    expect(map.get("p1")?.bowlerName).toBe("Jones");
  });

  it("collects wickets across both innings", () => {
    const map = buildDismissalMap(
      [ball([wicketBall({ outBatterId: "p1", bowler: { name: "Jones" } })])],
      [ball([wicketBall({ outBatterId: "p5", bowler: { name: "Khan" } })])]
    );
    expect(map.size).toBe(2);
    expect(map.get("p5")?.bowlerName).toBe("Khan");
  });
});

describe("makeGetDismissalStatus", () => {
  const stat = (playerId: string) => ({ playerId } as any);

  it("reports a batter with no dismissal as not out", () => {
    const get = makeGetDismissalStatus(new Map());
    expect(get(stat("p1"))).toBe("not out");
  });

  it("formats each dismissal type in scorebook notation", () => {
    const map = buildDismissalMap([
      ball([
        wicketBall({
          outBatterId: "caught",
          outType: "caught",
          bowler: { name: "Jones" },
          fielder: { name: "Smith" },
        }),
        wicketBall({
          outBatterId: "caughtAndBowled",
          outType: "caught",
          bowler: { name: "Jones" },
        }),
        wicketBall({
          outBatterId: "stumped",
          outType: "stumped",
          bowler: { name: "Jones" },
          fielder: { name: "Smith" },
        }),
        wicketBall({
          outBatterId: "runout",
          outType: "runout",
          bowler: { name: "Jones" },
          fielder: { name: "Smith" },
        }),
        wicketBall({
          outBatterId: "bowled",
          outType: "bowled",
          bowler: { name: "Jones" },
        }),
      ]),
    ]);
    const get = makeGetDismissalStatus(map);

    expect(get(stat("caught"))).toBe("c Smith b Jones");
    expect(get(stat("caughtAndBowled"))).toBe("c & b Jones");
    expect(get(stat("stumped"))).toBe("st Smith b Jones");
    expect(get(stat("runout"))).toBe("run out (Smith)");
    expect(get(stat("bowled"))).toBe("b Jones");
  });
});
