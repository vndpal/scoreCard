import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { playerStats } from "@/types/playerStats";
import { player } from "@/types/player";
import { useAppContext } from "@/context/AppContext";
import { Player } from "@/firebase/models/Player";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { MatchScore } from "@/firebase/models/MatchScores";
import { Match } from "@/firebase/models/Match";

const MAN_OF_THE_MATCH_API_URL =
  "https://score-card-api-py.vercel.app/api/man-of-the-match";

interface DismissalInfo {
  playerId: string;
  bowlerName: string;
}

const MatchSummary = () => {
  const { matchId, team1, team2 } = useLocalSearchParams();
  const [battingRecordsTeamA, setBattingRecordsTeamA] = useState<playerStats[]>(
    []
  );
  const [bowlingRecordsTeamA, setBowlingRecordsTeamA] = useState<playerStats[]>(
    []
  );
  const [battingRecordsTeamB, setBattingRecordsTeamB] = useState<playerStats[]>(
    []
  );
  const [bowlingRecordsTeamB, setBowlingRecordsTeamB] = useState<playerStats[]>(
    []
  );
  const [playersMap, setPlayersMap] = useState<Map<string, string>>(new Map());
  const [dismissalMap, setDismissalMap] = useState<Map<string, DismissalInfo>>(
    new Map()
  );
  const [isPosting, setIsPosting] = useState(false);

  const { currentTheme } = useAppContext();
  const insets = useSafeAreaInsets();
  const isDark = currentTheme === "dark";

  useEffect(() => {
    (async () => {
      const players = await Player.getAll();
      const matchStats = await PlayerMatchStats.getByMatchId(matchId as string);

      if (matchStats && players) {
        const playersMap = new Map<string, string>();
        players.forEach((p: player) => {
          playersMap.set(p.id.toString(), p.name);
        });
        setPlayersMap(playersMap);

        try {
          const dismissals = await fetchDismissalInfo(matchId as string);
          setDismissalMap(dismissals);
        } catch (err) {
          console.log("Could not fetch dismissal info:", err);
        }

        if (matchStats) {
          const sortByRuns = (a: playerStats, b: playerStats) =>
            b.runs - a.runs;
          const sortByWickets = (a: playerStats, b: playerStats) =>
            b.wickets - a.wickets;

          setBattingRecordsTeamA(
            matchStats.playerMatchStats
              .filter((x: playerStats) => x.team === team1)
              .sort(sortByRuns)
          );
          setBowlingRecordsTeamA(
            matchStats.playerMatchStats
              .filter((x: playerStats) => x.team === team1)
              .filter(
                (x: playerStats) =>
                  x.wickets > 0 || x.ballsBowled > 0 || x.overs > 0
              )
              .sort(sortByWickets)
          );
          setBattingRecordsTeamB(
            matchStats.playerMatchStats
              .filter((x: playerStats) => x.team === team2)
              .sort(sortByRuns)
          );
          setBowlingRecordsTeamB(
            matchStats.playerMatchStats
              .filter((x: playerStats) => x.team === team2)
              .filter(
                (x: playerStats) =>
                  x.wickets > 0 || x.ballsBowled > 0 || x.overs > 0
              )
              .sort(sortByWickets)
          );
        }
      }
    })();
  }, [matchId]);

  const fetchDismissalInfo = async (
    matchId: string
  ): Promise<Map<string, DismissalInfo>> => {
    const dismissals = new Map<string, DismissalInfo>();

    try {
      for (let inning = 1; inning <= 2; inning++) {
        const matchScores = await MatchScore.getByMatchIdInningNumber(
          matchId,
          inning
        );

        if (matchScores && Array.isArray(matchScores)) {
          matchScores.forEach((scoreData: any) => {
            if (scoreData.overSummary && Array.isArray(scoreData.overSummary)) {
              scoreData.overSummary.forEach((ball: any) => {
                if (ball.isWicket && ball.strikerBatter && ball.bowler) {
                  const playerId = ball.strikerBatter.id?.toString() || "";
                  const bowlerName = ball.bowler.name || "Unknown";
                  dismissals.set(playerId, {
                    playerId,
                    bowlerName,
                  });
                }
              });
            }
          });
        }
      }
    } catch (err) {
      console.log("Error fetching dismissals:", err);
    }

    return dismissals;
  };

  const getDismissalStatus = (stat: playerStats): string => {
    const dismissal = dismissalMap.get(stat.playerId);
    if (dismissal) {
      return `b ${dismissal.bowlerName}`;
    }
    return "not out";
  };

  // Builds the full match payload (match meta + player scorecard + ball-by-ball)
  // expected by the external API.
  const buildMatchPayload = async () => {
    const id = matchId as string;

    const [matchDoc, statsDoc, inning1, inning2] = await Promise.all([
      Match.getById(id),
      PlayerMatchStats.getByMatchId(id),
      MatchScore.getByMatchIdInningNumber(id, 1),
      MatchScore.getByMatchIdInningNumber(id, 2),
    ]);

    const toIso = (ts?: any) =>
      ts && typeof ts.toDate === "function" ? ts.toDate().toISOString() : null;

    const mapBall = (ball: any) => ({
      run: ball.run,
      extra: ball.extra,
      totalRun: ball.totalRun,
      isWicket: ball.isWicket,
      isNoBall: ball.isNoBall,
      isWideBall: ball.isWideBall,
      isOverEnd: ball.isOverEnd,
      strikerBatter: ball.strikerBatter
        ? { id: ball.strikerBatter.id, name: ball.strikerBatter.name }
        : null,
      nonStrikerBatter: ball.nonStrikerBatter
        ? { id: ball.nonStrikerBatter.id, name: ball.nonStrikerBatter.name }
        : null,
      bowler: ball.bowler
        ? { id: ball.bowler.id, name: ball.bowler.name }
        : null,
    });

    const buildInning = (inningNumber: number, scores: MatchScore[] | null) => {
      if (!scores || scores.length === 0) return null;
      return {
        inningNumber,
        teamId: scores[0].teamId,
        overs: scores.map((s) => ({
          overNumber: s.overNumber,
          balls: (s.overSummary || []).map(mapBall),
        })),
      };
    };

    const innings = [buildInning(1, inning1), buildInning(2, inning2)].filter(
      Boolean
    );

    return {
      schemaVersion: 1,
      source: "scorecard-mobile",
      submittedAt: new Date().toISOString(),
      match: matchDoc
        ? {
            matchId: matchDoc.matchId,
            clubId: matchDoc.clubId,
            tournamentId: matchDoc.tournamentId,
            team1: matchDoc.team1,
            team2: matchDoc.team2,
            team1Fullname: matchDoc.team1Fullname,
            team2Fullname: matchDoc.team2Fullname,
            tossWin: matchDoc.tossWin,
            choose: matchDoc.choose,
            winner: matchDoc.winner ?? null,
            status: matchDoc.status,
            isFirstInning: matchDoc.isFirstInning,
            quickMatch: matchDoc.quickMatch,
            overs: matchDoc.overs,
            wickets: matchDoc.wickets ?? null,
            manOfTheMatch: matchDoc.manOfTheMatch,
            startDateTime: toIso(matchDoc.startDateTime),
            endDateTime: toIso(matchDoc.endDateTime),
            currentScore: matchDoc.currentScore,
          }
        : null,
      playerMatchStats: statsDoc?.playerMatchStats ?? [],
      innings,
    };
  };

  const handleFetchManOfTheMatch = async () => {
    // Guard: never run twice concurrently or without a match id.
    if (isPosting) return;
    if (!matchId) {
      Alert.alert("Error", "Match information is not available yet.");
      return;
    }

    // Self-imposed timeout so a hanging network call can never leave the
    // button stuck on a spinner.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      setIsPosting(true);

      const payload = await buildMatchPayload();

      const response = await fetch(MAN_OF_THE_MATCH_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      // Tolerate non-JSON / empty responses without throwing.
      let resultText: string;
      try {
        const data = await response.json();
        resultText = JSON.stringify(data);
      } catch {
        resultText = "Request succeeded.";
      }
      Alert.alert("Man of the Match", resultText);
    } catch (err: any) {
      // Swallow everything here — this feature is fully isolated and must
      // never propagate an error to the rest of the screen/app.
      console.log("Fetch Man of the Match failed:", err);
      const message =
        err?.name === "AbortError"
          ? "Request timed out. Please try again."
          : err?.message || "Failed to fetch Man of the Match. Please try again.";
      Alert.alert("Error", message);
    } finally {
      clearTimeout(timeoutId);
      setIsPosting(false);
    }
  };

  const BattingTable = ({
    data,
    teamColor,
  }: {
    data: playerStats[];
    teamColor: string;
  }) => (
    <View style={styles.tableContainer}>
      {/* Header */}
      <View style={[styles.battingHeaderRow, { backgroundColor: teamColor }]}>
        <Text style={[styles.battingHeaderCell, styles.playerCell]}>PLAYER</Text>
        <Text style={[styles.battingHeaderCell, styles.smallCell]}>R</Text>
        <Text style={[styles.battingHeaderCell, styles.smallCell]}>B</Text>
        <Text style={[styles.battingHeaderCell, styles.smallCell]}>4</Text>
        <Text style={[styles.battingHeaderCell, styles.smallCell]}>6</Text>
        <Text style={[styles.battingHeaderCell, styles.srCell]}>SR</Text>
        <Text style={[styles.battingHeaderCell, styles.statusCell]}>STATUS</Text>
      </View>

      {/* Rows */}
      {data.map((row, idx) => (
        <View key={idx} style={styles.battingRow}>
          <Text
            style={[styles.battingCell, styles.playerCell]}
            numberOfLines={1}
          >
            {playersMap.get(row.playerId) || row.playerId}
          </Text>
          <Text style={[styles.battingCell, styles.smallCell]}>
            {row.runs}
          </Text>
          <Text style={[styles.battingCell, styles.smallCell]}>
            {row.ballsFaced}
          </Text>
          <Text style={[styles.battingCell, styles.smallCell]}>
            {row.fours}
          </Text>
          <Text style={[styles.battingCell, styles.smallCell]}>
            {row.sixes}
          </Text>
          <Text style={[styles.battingCell, styles.srCell]}>
            {row.strikeRate.toFixed(0)}
          </Text>
          <Text
            style={[styles.battingCell, styles.statusCell]}
            numberOfLines={1}
          >
            {getDismissalStatus(row)}
          </Text>
        </View>
      ))}
    </View>
  );

  const BowlingTable = ({
    data,
    teamColor,
  }: {
    data: playerStats[];
    teamColor: string;
  }) => (
    <View style={styles.tableContainer}>
      {/* Header */}
      <View style={[styles.bowlingHeaderRow, { backgroundColor: teamColor }]}>
        <Text style={[styles.bowlingHeaderCell, styles.playerCell]}>PLAYER</Text>
        <Text style={[styles.bowlingHeaderCell, styles.smallCell]}>O</Text>
        <Text style={[styles.bowlingHeaderCell, styles.smallCell]}>W</Text>
        <Text style={[styles.bowlingHeaderCell, styles.smallCell]}>R</Text>
        <Text style={[styles.bowlingHeaderCell, styles.smallCell]}>Ex</Text>
        <Text style={[styles.bowlingHeaderCell, styles.smallCell]}>4</Text>
        <Text style={[styles.bowlingHeaderCell, styles.smallCell]}>6</Text>
      </View>

      {/* Rows */}
      {data.map((row, idx) => (
        <View key={idx} style={styles.bowlingRow}>
          <Text
            style={[styles.bowlingCell, styles.playerCell]}
            numberOfLines={1}
          >
            {playersMap.get(row.playerId) || row.playerId}
          </Text>
          <Text style={[styles.bowlingCell, styles.smallCell]}>
            {row.ballsBowled > 0 ? `${row.overs}.${row.ballsBowled}` : row.overs}
          </Text>
          <Text style={[styles.bowlingCell, styles.smallCell]}>
            {row.wickets}
          </Text>
          <Text style={[styles.bowlingCell, styles.smallCell]}>
            {row.runsConceded}
          </Text>
          <Text style={[styles.bowlingCell, styles.smallCell]}>
            {row.extras}
          </Text>
          <Text style={[styles.bowlingCell, styles.smallCell]}>
            {row.foursConceded}
          </Text>
          <Text style={[styles.bowlingCell, styles.smallCell]}>
            {row.sixesConceded}
          </Text>
        </View>
      ))}
    </View>
  );

  const TeamSectionHeader = ({
    teamName,
    backgroundColor,
  }: {
    teamName: string;
    backgroundColor: string;
  }) => (
    <View style={[styles.sectionHeader, { backgroundColor }]}>
      <Text style={styles.sectionHeaderText}>{teamName?.toUpperCase()}</Text>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Team 1 - Batting */}
      <TeamSectionHeader teamName={team1 as string} backgroundColor="#1e40af" />
      <Text style={styles.subHeader}>BATTING</Text>
      <BattingTable data={battingRecordsTeamA} teamColor="#334155" />

      {/* Team 1 - Bowling */}
      <Text style={styles.subHeader}>BOWLING</Text>
      <BowlingTable data={bowlingRecordsTeamA} teamColor="#334155" />

      {/* Divider */}
      <View style={styles.divider} />

      {/* Team 2 - Batting */}
      <TeamSectionHeader teamName={team2 as string} backgroundColor="#16a34a" />
      <Text style={styles.subHeader}>BATTING</Text>
      <BattingTable data={battingRecordsTeamB} teamColor="#334155" />

      {/* Team 2 - Bowling */}
      <Text style={styles.subHeader}>BOWLING</Text>
      <BowlingTable data={bowlingRecordsTeamB} teamColor="#334155" />

      {/* Fetch Man of the Match */}
      <TouchableOpacity
        style={[styles.fetchButton, isPosting && styles.fetchButtonDisabled]}
        onPress={handleFetchManOfTheMatch}
        disabled={isPosting}
        activeOpacity={0.8}
      >
        {isPosting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.fetchButtonText}>Fetch Man of the Match</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  darkBg: {
    backgroundColor: "#0f172a",
  },
  lightBg: {
    backgroundColor: "#fafafa",
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
    borderRadius: 4,
  },
  sectionHeaderText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  subHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#64748b",
    marginLeft: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  tableContainer: {
    marginHorizontal: 4,
    marginVertical: 4,
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  // Batting Table Styles
  battingHeaderRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  battingHeaderCell: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  battingRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  battingCell: {
    fontSize: 10,
    fontWeight: "500",
    color: "#1e293b",
    textAlign: "center",
  },
  // Bowling Table Styles
  bowlingHeaderRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  bowlingHeaderCell: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  bowlingRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  bowlingCell: {
    fontSize: 10,
    fontWeight: "500",
    color: "#1e293b",
    textAlign: "center",
  },
  // Column widths
  playerCell: {
    flex: 2.5,
    textAlign: "left",
    paddingLeft: 4,
  },
  smallCell: {
    flex: 1,
  },
  srCell: {
    flex: 1.2,
  },
  statusCell: {
    flex: 1.8,
    textAlign: "left",
    paddingLeft: 2,
  },
  divider: {
    height: 12,
    marginVertical: 8,
  },
  fetchButton: {
    marginHorizontal: 8,
    marginTop: 20,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#1e40af",
    alignItems: "center",
    justifyContent: "center",
  },
  fetchButtonDisabled: {
    opacity: 0.6,
  },
  fetchButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default MatchSummary;
