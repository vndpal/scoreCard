import { player } from "../types/player";
import {
  PlayerStrengthStats,
  balanceTeams,
  balanceTeamsRandom,
  computeBalance,
  computeTeamStrength,
} from "./teamBalance";

// Deterministic PRNG (mulberry32) so randomized tests are reproducible.
const seeded = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

// Batting-only stats so only the strike-rate/runs terms matter.
const STRONG: PlayerStrengthStats = {
  sr: 300,
  eco: 6,
  runs: 500,
  wickets: 20,
  matches: 10,
  ballsFaced: 100,
  ballsBowled: 0,
};
const WEAK: PlayerStrengthStats = {
  sr: 100,
  eco: 12,
  runs: 100,
  wickets: 2,
  matches: 10,
  ballsFaced: 100,
  ballsBowled: 0,
};

const p = (id: string): player => ({ id, name: id, clubId: "club" });
const ids = (players: player[]) => players.map((x) => x.id).sort();

/** Build a stats map: ids in `strong` get STRONG, everything else gets WEAK. */
const makeStats = (
  strong: string[],
): Record<string, PlayerStrengthStats> => {
  const set = new Set(strong);
  const map: Record<string, PlayerStrengthStats> = {};
  for (const id of ["s1", "s2", "s3", "w1", "w2", "w3"]) {
    map[id] = set.has(id) ? STRONG : WEAK;
  }
  return map;
};

const gap = (
  t1: player[],
  t2: player[],
  stats: Record<string, PlayerStrengthStats>,
) =>
  Math.abs(
    computeTeamStrength(t1, stats) - computeTeamStrength(t2, stats),
  );

describe("balanceTeams", () => {
  it("balances a lopsided even split to ~50/50", () => {
    const stats = makeStats(["s1", "s2"]);
    const team1 = [p("s1"), p("s2")]; // both strong
    const team2 = [p("w1"), p("w2")]; // both weak

    const result = balanceTeams(team1, team2, stats);

    expect(result.moves).toBeGreaterThan(0);
    // Counts unchanged for an even split (swaps only).
    expect(result.team1).toHaveLength(2);
    expect(result.team2).toHaveLength(2);
    const { pct1 } = computeBalance(
      computeTeamStrength(result.team1, stats),
      computeTeamStrength(result.team2, stats),
    );
    expect(Math.abs(pct1 - 50)).toBeLessThanOrEqual(2);
  });

  it("improves balance and keeps team counts within 1 (odd split)", () => {
    const stats = makeStats(["s1", "s2", "s3"]);
    const team1 = [p("s1"), p("s2"), p("s3")]; // 3 strong
    const team2 = [p("w1"), p("w2")]; // 2 weak

    const before = gap(team1, team2, stats);
    const result = balanceTeams(team1, team2, stats);

    expect(result.moves).toBeGreaterThan(0);
    expect(gap(result.team1, result.team2, stats)).toBeLessThan(before);
    expect(
      Math.abs(result.team1.length - result.team2.length),
    ).toBeLessThanOrEqual(1);
    // No player is lost or duplicated.
    expect(ids([...result.team1, ...result.team2])).toEqual([
      "s1",
      "s2",
      "s3",
      "w1",
      "w2",
    ]);
  });

  it("never moves a locked player", () => {
    const stats = makeStats(["s1", "s2"]);
    const team1 = [p("s1"), p("s2")]; // s1 locked, s2 movable
    const team2 = [p("w1"), p("w2")];

    const result = balanceTeams(team1, team2, stats, ["s1"]);

    expect(result.moves).toBeGreaterThan(0);
    expect(result.team1.map((x) => x.id)).toContain("s1"); // stayed put
    expect(result.team2.map((x) => x.id)).toContain("s2"); // movable one moved
  });

  it("returns moves=0 for already-balanced teams and leaves them untouched", () => {
    const stats = makeStats(["s1", "s2"]);
    const team1 = [p("s1"), p("w1")]; // one strong + one weak
    const team2 = [p("s2"), p("w2")]; // one strong + one weak

    const result = balanceTeams(team1, team2, stats);

    expect(result.moves).toBe(0);
    expect(result.team1.map((x) => x.id)).toEqual(["s1", "w1"]);
    expect(result.team2.map((x) => x.id)).toEqual(["s2", "w2"]);
  });

  it("returns moves=0 when every player is locked", () => {
    const stats = makeStats(["s1", "s2"]);
    const team1 = [p("s1"), p("s2")];
    const team2 = [p("w1"), p("w2")];

    const result = balanceTeams(team1, team2, stats, [
      "s1",
      "s2",
      "w1",
      "w2",
    ]);

    expect(result.moves).toBe(0);
  });
});

describe("balanceTeamsRandom", () => {
  it("produces a fair split with all players and unchanged counts", () => {
    const stats = makeStats(["s1", "s2"]);
    const team1 = [p("s1"), p("s2")]; // both strong
    const team2 = [p("w1"), p("w2")]; // both weak

    const result = balanceTeamsRandom(team1, team2, stats, [], {
      random: seeded(7),
    });

    expect(result.changed).toBe(true);
    expect(result.team1).toHaveLength(2);
    expect(result.team2).toHaveLength(2);
    expect(ids([...result.team1, ...result.team2])).toEqual([
      "s1",
      "s2",
      "w1",
      "w2",
    ]);
    const { pct1 } = computeBalance(
      computeTeamStrength(result.team1, stats),
      computeTeamStrength(result.team2, stats),
    );
    expect(Math.abs(pct1 - 50)).toBeLessThanOrEqual(3);
  });

  it("yields different combinations across calls (variety)", () => {
    const stats = makeStats(["s1", "s2", "s3"]);
    const base1 = [p("s1"), p("s2"), p("w1")];
    const base2 = [p("s3"), p("w2"), p("w3")];

    const seen = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const r = balanceTeamsRandom(base1, base2, stats, [], {
        random: seeded(seed),
      });
      seen.add(ids(r.team1).join(","));
    }
    // A fair roster has several ~50/50 partitions — expect more than one.
    expect(seen.size).toBeGreaterThan(1);
  });

  it("keeps locked players on their team", () => {
    const stats = makeStats(["s1", "s2"]);
    const team1 = [p("s1"), p("s2")];
    const team2 = [p("w1"), p("w2")];

    const result = balanceTeamsRandom(team1, team2, stats, ["s1"], {
      random: seeded(3),
    });

    expect(result.team1.map((x) => x.id)).toContain("s1");
    expect(
      Math.abs(result.team1.length - result.team2.length),
    ).toBeLessThanOrEqual(1);
  });

  it("reports changed=false when there is nothing to shuffle", () => {
    const stats = makeStats(["s1"]);
    const team1 = [p("s1")];
    const team2 = [p("w1")];

    const result = balanceTeamsRandom(team1, team2, stats, ["s1", "w1"]);

    expect(result.changed).toBe(false);
    expect(result.team1.map((x) => x.id)).toEqual(["s1"]);
    expect(result.team2.map((x) => x.id)).toEqual(["w1"]);
  });
});
