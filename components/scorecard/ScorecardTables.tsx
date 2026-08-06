import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { playerStats } from "@/types/playerStats";
import { currentTotalScore } from "@/types/currentTotalScore";

// --- Theme tokens -----------------------------------------------------------
// "Scorebook" palette: warm paper + ink, a charcoal scoreboard panel, and a
// single claret accent (cricket-ball / county-cap red) used sparingly. One
// hue on the whole page — everything else is ink on paper.
export const makeTheme = (isDark: boolean) => ({
  screen: isDark ? "#15130f" : "#e6e3dc",
  surface: isDark ? "#211d17" : "#fbfaf6",
  ink: isDark ? "#efeae0" : "#1c1815",
  inkSoft: isDark ? "#b0a897" : "#57514a",
  inkFaint: isDark ? "#79736a" : "#8c867b",
  rule: isDark ? "#332e25" : "#d9d4ca",
  accent: isDark ? "#cd5b56" : "#8f2f37", // claret / cricket leather
  // Behind white text (pills, filled buttons); the claret carries it as is.
  accentFill: isDark ? "#a33a38" : "#8f2f37",
  accentSoft: isDark ? "rgba(205,91,86,0.14)" : "rgba(143,47,55,0.08)",
  live: isDark ? "#cd5b56" : "#8f2f37", // one hue on the page, so: the accent
  win: isDark ? "#cd5b56" : "#8f2f37",
  // Scoreboard panel (the hero) — a warm charcoal in both themes.
  panel: isDark ? "#100e0a" : "#211c16",
  panelInk: "#f3eee2",
  panelInkSoft: "#c6bcac",
  panelRule: "rgba(243,238,226,0.10)",
  btn: isDark ? "#38322a" : "#221d17",
});

export type Theme = ReturnType<typeof makeTheme>;

/**
 * Same tokens, drawn from the palette the rest of the app already uses — the
 * match list (#121212 / #f8f9fa), the scoreboard charcoal (#282c34) and the
 * tint from `constants/Colors`. Screens that should feel like part of the app
 * rather than a printed scorebook take this one.
 */
export const makeAppTheme = (isDark: boolean): Theme => ({
  screen: isDark ? "#121212" : "#f8f9fa",
  surface: isDark ? "#1e1e1e" : "#ffffff",
  ink: isDark ? "#ffffff" : "#333333",
  inkSoft: isDark ? "#b0b0b0" : "#666666",
  inkFaint: isDark ? "#8a9099" : "#8c929a",
  rule: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
  // Bright enough to read as text on a dark screen…
  accent: isDark ? "#4fb8e0" : "#0a7ea4",
  // …but a filled button needs a deeper shade to hold white text.
  accentFill: isDark ? "#1a7fa3" : "#0a7ea4",
  accentSoft: isDark ? "rgba(79,184,224,0.16)" : "rgba(10,126,164,0.10)",
  live: isDark ? "#ff4136" : "#d93025", // the match list's live badge red
  win: "#f39c12", // the match list's winner gold
  // The headline is a raised card here, not a printed scoreboard.
  panel: isDark ? "#282c34" : "#ffffff",
  panelInk: isDark ? "#ffffff" : "#1f2429",
  panelInkSoft: isDark ? "#b0b6bd" : "#5f666d",
  panelRule: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
  btn: isDark ? "#333842" : "#eef1f4",
});

export const SectionTitle = ({
  text,
  c,
  right,
}: {
  text: string;
  c: Theme;
  /** Optional trailing hint, e.g. "swipe for previous →". */
  right?: React.ReactNode;
}) => (
  <View style={styles.sectionTitleRow}>
    <View style={[styles.sectionTick, { backgroundColor: c.accent }]} />
    <Text style={[styles.sectionTitle, { color: c.inkSoft }]}>
      {text.toUpperCase()}
    </Text>
    {!!right && <View style={styles.sectionTitleRight}>{right}</View>}
  </View>
);

// --- Innings card (team strip -> batting -> bowling) ------------------------
export const InningsCard = ({
  team,
  totals,
  batting,
  bowling,
  c,
  playersMap,
  getDismissalStatus,
  collapseDidNotBat = false,
}: {
  team: string;
  totals: currentTotalScore | null;
  batting: playerStats[];
  bowling: playerStats[];
  c: Theme;
  playersMap: Map<string, string>;
  getDismissalStatus: (s: playerStats) => string;
  /** Roll the "did not bat" players into a single expandable row. */
  collapseDidNotBat?: boolean;
}) => (
  <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.rule }]}>
    {/* Team strip */}
    <View style={styles.inningsHeader}>
      <View style={[styles.accentBar, { backgroundColor: c.accent }]} />
      <Text style={[styles.inningsTeam, { color: c.ink }]} numberOfLines={1}>
        {team}
      </Text>
      <Text style={[styles.inningsTotal, { color: c.ink }]}>
        {totals?.totalRuns ?? 0}
        <Text style={{ color: c.inkSoft }}>/{totals?.totalWickets ?? 0}</Text>
        <Text style={[styles.inningsOvers, { color: c.inkFaint }]}>
          {"  "}({totals?.totalOvers ?? 0}.{totals?.totalBalls ?? 0})
        </Text>
      </Text>
    </View>

    <TableLabel text="Batting" c={c} />
    <BattingTable
      data={batting}
      totals={totals}
      c={c}
      playersMap={playersMap}
      getDismissalStatus={getDismissalStatus}
      collapseDidNotBat={collapseDidNotBat}
    />

    <TableLabel text="Bowling" c={c} />
    <BowlingTable data={bowling} c={c} playersMap={playersMap} />
  </View>
);

export const TableLabel = ({ text, c }: { text: string; c: Theme }) => (
  <Text style={[styles.tableLabel, { color: c.inkFaint }]}>
    {text.toUpperCase()}
  </Text>
);

// --- Batting table ----------------------------------------------------------
export const BattingTable = ({
  data,
  totals,
  c,
  playersMap,
  getDismissalStatus,
  collapseDidNotBat = false,
}: {
  data: playerStats[];
  totals: currentTotalScore | null;
  c: Theme;
  playersMap: Map<string, string>;
  getDismissalStatus: (s: playerStats) => string;
  collapseDidNotBat?: boolean;
}) => {
  const [yetToBatOpen, setYetToBatOpen] = useState(false);

  // A team member with no runs and no balls, not recorded as out, never
  // actually batted — show "did not bat" rather than "not out".
  const isDidNotBat = (row: playerStats) =>
    getDismissalStatus(row) === "not out" &&
    row.ballsFaced === 0 &&
    row.runs === 0;

  // Mid-innings the tail is mostly empty rows of 0(0)·0·0·0 — worth one line,
  // not one row each. Off by default so the match summary is unchanged.
  const rows = collapseDidNotBat ? data.filter((r) => !isDidNotBat(r)) : data;
  const yetToBat = collapseDidNotBat
    ? data.filter(isDidNotBat).map((r) => playersMap.get(r.playerId) || r.playerId)
    : [];

  return (
    <View>
      <View style={[styles.headRow, { borderBottomColor: c.rule }]}>
        <Text style={[styles.hCellName, { color: c.inkFaint }]}>BATTER</Text>
        <Text style={[styles.hCell, { color: c.inkFaint }]}>R</Text>
        <Text style={[styles.hCell, { color: c.inkFaint }]}>B</Text>
        <Text style={[styles.hCellSm, { color: c.inkFaint }]}>4s</Text>
        <Text style={[styles.hCellSm, { color: c.inkFaint }]}>6s</Text>
        <Text style={[styles.hCellWide, { color: c.inkFaint }]}>SR</Text>
      </View>

      {rows.length === 0 ? (
        <Text style={[styles.emptyRow, { color: c.inkFaint }]}>
          No batting recorded
        </Text>
      ) : (
        rows.map((row, idx) => {
          const isTop = idx === 0 && row.runs > 0;
          const label = getDismissalStatus(row);
          const displayLabel = isDidNotBat(row) ? "did not bat" : label;
          return (
            <View
              key={idx}
              style={[styles.dataRow, { borderBottomColor: c.rule }]}
            >
              <View style={styles.nameCell}>
                <Text
                  style={[
                    styles.playerName,
                    { color: c.ink },
                    isTop && { color: c.accent, fontWeight: "700" },
                  ]}
                  numberOfLines={1}
                >
                  {playersMap.get(row.playerId) || row.playerId}
                </Text>
                <Text
                  style={[styles.dismissal, { color: c.inkFaint }]}
                  numberOfLines={1}
                >
                  {displayLabel}
                </Text>
              </View>
              <Text style={[styles.numCell, styles.numBold, { color: c.ink }]}>
                {row.runs}
              </Text>
              <Text style={[styles.numCell, { color: c.inkSoft }]}>
                {row.ballsFaced}
              </Text>
              <Text style={[styles.numCellSm, { color: c.inkSoft }]}>
                {row.fours}
              </Text>
              <Text style={[styles.numCellSm, { color: c.inkSoft }]}>
                {row.sixes}
              </Text>
              <Text style={[styles.numCellWide, { color: c.inkSoft }]}>
                {row.strikeRate ? row.strikeRate.toFixed(0) : "0"}
              </Text>
            </View>
          );
        })
      )}

      {yetToBat.length > 0 && (
        <View>
          <TouchableOpacity
            style={[styles.yetToBatRow, { borderBottomColor: c.rule }]}
            onPress={() => setYetToBatOpen((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.yetToBatLabel, { color: c.inkSoft }]}>
              Yet to bat ({yetToBat.length})
            </Text>
            <Text style={[styles.yetToBatToggle, { color: c.accent }]}>
              {yetToBatOpen ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
          {yetToBatOpen && (
            <Text style={[styles.yetToBatNames, { color: c.inkFaint }]}>
              {yetToBat.join(", ")}
            </Text>
          )}
        </View>
      )}

      {/* Total row (authoritative innings score) */}
      {!!totals && (
        <View style={[styles.totalRow, { borderTopColor: c.rule }]}>
          <Text style={[styles.totalLabel, { color: c.inkSoft }]}>Total</Text>
          <Text style={[styles.totalValue, { color: c.ink }]}>
            {totals.totalRuns}/{totals.totalWickets}
            <Text style={[styles.totalOvers, { color: c.inkFaint }]}>
              {"  "}({totals.totalOvers}.{totals.totalBalls} ov)
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
};

// --- Bowling table ----------------------------------------------------------
export const BowlingTable = ({
  data,
  c,
  playersMap,
}: {
  data: playerStats[];
  c: Theme;
  playersMap: Map<string, string>;
}) => (
  <View>
    <View style={[styles.headRow, { borderBottomColor: c.rule }]}>
      <Text style={[styles.hCellName, { color: c.inkFaint }]}>BOWLER</Text>
      <Text style={[styles.hCell, { color: c.inkFaint }]}>O</Text>
      <Text style={[styles.hCellSm, { color: c.inkFaint }]}>M</Text>
      <Text style={[styles.hCell, { color: c.inkFaint }]}>R</Text>
      <Text style={[styles.hCellSm, { color: c.inkFaint }]}>W</Text>
      <Text style={[styles.hCellWide, { color: c.inkFaint }]}>ECON</Text>
    </View>

    {data.length === 0 ? (
      <Text style={[styles.emptyRow, { color: c.inkFaint }]}>
        No bowling recorded
      </Text>
    ) : (
      data.map((row, idx) => {
        const didBowl = row.overs > 0 || row.ballsBowled > 0;
        const legalBalls = row.overs * 6 + row.ballsBowled;
        const econ = legalBalls > 0 ? row.runsConceded / (legalBalls / 6) : 0;
        const oversLabel =
          row.ballsBowled > 0
            ? `${row.overs}.${row.ballsBowled}`
            : `${row.overs}`;
        const fielding = [
          row.catches ? `${row.catches} ct` : "",
          row.stumpings ? `${row.stumpings} st` : "",
          row.runOuts ? `${row.runOuts} ro` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        const isTop = idx === 0 && row.wickets > 0;
        return (
          <View
            key={idx}
            style={[styles.dataRow, { borderBottomColor: c.rule }]}
          >
            <View style={styles.nameCell}>
              <Text
                style={[
                  styles.playerName,
                  { color: c.ink },
                  isTop && { color: c.accent, fontWeight: "700" },
                ]}
                numberOfLines={1}
              >
                {playersMap.get(row.playerId) || row.playerId}
              </Text>
              {!!fielding && (
                <Text
                  style={[styles.dismissal, { color: c.inkFaint }]}
                  numberOfLines={1}
                >
                  {fielding}
                </Text>
              )}
            </View>
            <Text style={[styles.numCell, { color: c.inkSoft }]}>
              {didBowl ? oversLabel : "–"}
            </Text>
            <Text style={[styles.numCellSm, { color: c.inkSoft }]}>
              {didBowl ? row.maidens || 0 : "–"}
            </Text>
            <Text style={[styles.numCell, { color: c.inkSoft }]}>
              {didBowl ? row.runsConceded : "–"}
            </Text>
            <Text style={[styles.numCellSm, styles.numBold, { color: c.ink }]}>
              {didBowl ? row.wickets : "–"}
            </Text>
            <Text style={[styles.numCellWide, { color: c.inkSoft }]}>
              {didBowl ? econ.toFixed(1) : "–"}
            </Text>
          </View>
        );
      })
    )}
  </View>
);

const styles = StyleSheet.create({
  // ---- Section title ----
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTick: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  sectionTitleRight: {
    flex: 1,
    alignItems: "flex-end",
  },

  // ---- Innings card ----
  card: {
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  inningsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  accentBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
    marginRight: 10,
  },
  inningsTeam: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  inningsTotal: {
    fontSize: 17,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  inningsOvers: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ---- Table label ----
  tableLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 10,
    marginBottom: 2,
    marginLeft: 2,
  },

  // ---- Tables ----
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
  },
  nameCell: {
    flex: 3.4,
    paddingRight: 6,
  },
  playerName: {
    fontSize: 13.5,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  dismissal: {
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 2,
  },
  hCellName: {
    flex: 3.4,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  hCell: {
    flex: 1.1,
    fontSize: 9.5,
    fontWeight: "800",
    textAlign: "right",
    letterSpacing: 0.4,
  },
  hCellSm: {
    flex: 0.9,
    fontSize: 9.5,
    fontWeight: "800",
    textAlign: "right",
    letterSpacing: 0.4,
  },
  hCellWide: {
    flex: 1.4,
    fontSize: 9.5,
    fontWeight: "800",
    textAlign: "right",
    letterSpacing: 0.4,
  },
  numCell: {
    flex: 1.1,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  numCellSm: {
    flex: 0.9,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  numCellWide: {
    flex: 1.4,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  numBold: {
    fontWeight: "800",
  },
  emptyRow: {
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: 12,
    textAlign: "center",
  },
  yetToBatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
  },
  yetToBatLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  yetToBatToggle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  yetToBatNames: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    paddingHorizontal: 2,
    paddingBottom: 10,
    paddingTop: 2,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 2,
    borderTopWidth: 1.5,
    marginTop: 1,
  },
  totalLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  totalValue: {
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  totalOvers: {
    fontSize: 12,
    fontWeight: "600",
  },
});
