import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { player } from "@/types/player";
import { playerStats } from "@/types/playerStats";
import { Theme } from "@/components/scorecard/ScorecardTables";

/**
 * Read-only "who's at the crease" strip for the live viewer.
 *
 * Deliberately not `MatchPlayerStatsBar` — that one exists to *edit* the
 * players (swap, replace, declare) and truncates names to fit the entry
 * screen's controls. A spectator needs neither.
 */
const LivePlayersStrip = ({
  striker,
  nonStriker,
  bowler,
  playerStats: stats,
  c,
  title,
  style,
}: {
  striker?: player;
  nonStriker?: player;
  bowler?: player;
  playerStats: playerStats[];
  c: Theme;
  /** Optional card heading, e.g. "At the crease". */
  title?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const statFor = (p?: player) =>
    p ? stats.find((s) => s.playerId === p.id) : undefined;

  const strikerStats = statFor(striker);
  const nonStrikerStats = statFor(nonStriker);
  const bowlerStats = statFor(bowler);

  const battingLine = (s?: playerStats) => {
    if (!s) return "–";
    const sr = s.ballsFaced > 0 ? ((s.runs / s.ballsFaced) * 100).toFixed(0) : "0";
    return `${s.runs} (${s.ballsFaced})  ·  SR ${sr}`;
  };

  const bowlingLine = (s?: playerStats) => {
    if (!s) return "–";
    const oversLabel =
      s.ballsBowled > 0 ? `${s.overs}.${s.ballsBowled}` : `${s.overs}`;
    const legalBalls = s.overs * 6 + s.ballsBowled;
    const econ =
      legalBalls > 0 ? (s.runsConceded / (legalBalls / 6)).toFixed(1) : "0.0";
    return `${oversLabel}-${s.maidens || 0}-${s.runsConceded}-${s.wickets}  ·  ECON ${econ}`;
  };

  const Row = ({
    name,
    line,
    tag,
    highlight,
  }: {
    name: string;
    line: string;
    tag: string;
    highlight?: boolean;
  }) => (
    <View style={styles.row}>
      <View style={[styles.tag, { backgroundColor: c.accentSoft }]}>
        <Text style={[styles.tagText, { color: c.accent }]}>{tag}</Text>
      </View>
      <View style={styles.nameWrap}>
        <Text
          style={[
            styles.name,
            { color: c.ink },
            highlight && { fontWeight: "800" },
          ]}
          numberOfLines={1}
        >
          {name}
          {highlight ? " *" : ""}
        </Text>
      </View>
      <Text style={[styles.figures, { color: c.inkSoft }]} numberOfLines={1}>
        {line}
      </Text>
    </View>
  );

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: c.surface, borderColor: c.rule },
        style,
      ]}
    >
      {!!title && (
        <Text style={[styles.title, { color: c.inkFaint }]}>
          {title.toUpperCase()}
        </Text>
      )}
      {striker && (
        <Row
          tag="BAT"
          name={striker.name}
          line={battingLine(strikerStats)}
          highlight
        />
      )}
      {nonStriker && (
        <Row tag="BAT" name={nonStriker.name} line={battingLine(nonStrikerStats)} />
      )}
      {bowler && (
        <Row tag="BWL" name={bowler.name} line={bowlingLine(bowlerStats)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 6,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    gap: 10,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  nameWrap: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  figures: {
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});

export default LivePlayersStrip;
