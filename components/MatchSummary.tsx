import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { playerStats } from "@/types/playerStats";
import { player } from "@/types/player";
import { scorePerInning } from "@/types/scorePerInnig";
import { currentTotalScore } from "@/types/currentTotalScore";
import { useAppContext } from "@/context/AppContext";
import ScoreBoard from "@/components/ScoreBoard";
import { Player } from "@/firebase/models/Player";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { MatchScore } from "@/firebase/models/MatchScores";
import { Match } from "@/firebase/models/Match";
import { getMatchResultText } from "@/utils/getMatchResultText";
import {
  makeTheme,
  Theme,
  SectionTitle,
  InningsCard,
} from "@/components/scorecard/ScorecardTables";
import {
  DismissalInfo,
  buildDismissalMap,
  makeGetDismissalStatus,
} from "@/utils/dismissals";

const MAN_OF_THE_MATCH_API_URL =
  "https://score-card-api-py.vercel.app/api/man-of-the-match";

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
  const [team1Overs, setTeam1Overs] = useState<scorePerInning>([]);
  const [team2Overs, setTeam2Overs] = useState<scorePerInning>([]);
  const [team1Totals, setTeam1Totals] = useState<currentTotalScore | null>(
    null
  );
  const [team2Totals, setTeam2Totals] = useState<currentTotalScore | null>(
    null
  );
  const [allStats, setAllStats] = useState<playerStats[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const { currentTheme } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = currentTheme === "dark";
  const c = useMemo(() => makeTheme(isDark), [isDark]);

  const status = match?.status ?? null;

  useEffect(() => {
    (async () => {
      const [players, matchStats, matchDoc, inning1, inning2] =
        await Promise.all([
          Player.getAll(),
          PlayerMatchStats.getByMatchId(matchId as string),
          Match.getById(matchId as string),
          MatchScore.getByMatchIdInningNumber(matchId as string, 1),
          MatchScore.getByMatchIdInningNumber(matchId as string, 2),
        ]);

      // Over-by-over breakdown + innings totals for the ScoreBoard component
      // (same data the live/index screen feeds it).
      setTeam1Overs((inning1 ?? []).map((s) => s.overSummary));
      setTeam2Overs((inning2 ?? []).map((s) => s.overSummary));
      setTeam1Totals(matchDoc?.currentScore?.team1 ?? null);
      setTeam2Totals(matchDoc?.currentScore?.team2 ?? null);
      setMatch(matchDoc ?? null);

      if (matchStats && players) {
        const playersMap = new Map<string, string>();
        players.forEach((p: player) => {
          playersMap.set(p.id.toString(), p.name);
        });
        setPlayersMap(playersMap);

        try {
          // Reuse the innings already fetched above (no extra round-trip).
          // buildDismissalMap takes plain ball arrays so it stays firebase-free.
          const dismissals = buildDismissalMap(
            (inning1 ?? []).map((s) => s.overSummary),
            (inning2 ?? []).map((s) => s.overSummary)
          );
          setDismissalMap(dismissals);
        } catch (err) {
          console.log("Could not fetch dismissal info:", err);
        }

        if (matchStats) {
          setAllStats(matchStats.playerMatchStats);

          const sortByRuns = (a: playerStats, b: playerStats) =>
            b.runs - a.runs;
          const sortByWickets = (a: playerStats, b: playerStats) =>
            b.wickets - a.wickets || b.ballsBowled - a.ballsBowled;

          const contributedWithBallOrField = (x: playerStats) =>
            x.wickets > 0 ||
            x.ballsBowled > 0 ||
            x.overs > 0 ||
            (x.catches || 0) > 0 ||
            (x.stumpings || 0) > 0 ||
            (x.runOuts || 0) > 0;

          setBattingRecordsTeamA(
            matchStats.playerMatchStats
              .filter((x: playerStats) => x.team === team1)
              .sort(sortByRuns)
          );
          setBowlingRecordsTeamA(
            matchStats.playerMatchStats
              .filter((x: playerStats) => x.team === team1)
              .filter(contributedWithBallOrField)
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
              .filter(contributedWithBallOrField)
              .sort(sortByWickets)
          );
        }
      }
    })();
  }, [matchId]);

  const getDismissalStatus = makeGetDismissalStatus(dismissalMap);

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
      outType: ball.outType ?? null,
      outBatterId: ball.outBatterId ?? null,
      fielder: ball.fielder
        ? { id: ball.fielder.id, name: ball.fielder.name }
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
      Alert.alert("Player of the Match", resultText);
    } catch (err: any) {
      // Swallow everything here — this feature is fully isolated and must
      // never propagate an error to the rest of the screen/app.
      console.log("Fetch Player of the Match failed:", err);
      const message =
        err?.name === "AbortError"
          ? "Request timed out. Please try again."
          : err?.message ||
            "Couldn't get a Player of the Match suggestion. Please try again.";
      Alert.alert("Error", message);
    } finally {
      clearTimeout(timeoutId);
      setIsPosting(false);
    }
  };

  // --- Derived: result line + status ---------------------------------------
  const resultLine = useMemo(() => {
    if (!match) return "";
    switch (match.status) {
      case "completed":
        try {
          return getMatchResultText(
            match as any,
            match.currentScore?.team1,
            match.currentScore?.team2
          );
        } catch {
          return "Match completed";
        }
      case "tied":
        return "Match tied";
      case "draw":
        return "Match drawn";
      case "abandoned":
        return "Match abandoned";
      case "noResult":
        return "No result";
      case "live":
        return "Innings in progress";
      default:
        return "";
    }
  }, [match]);

  const statusLabel = useMemo(() => {
    if (status === "live") return "LIVE";
    if (status === "completed") return "RESULT";
    if (status) return status.toUpperCase();
    return null;
  }, [status]);

  // --- Derived: Player of the Match ----------------------------------------
  const motm = useMemo(() => {
    const id = match?.manOfTheMatch;
    if (!id) return null;
    const stat = allStats.find((s) => s.playerId === id);
    const name = playersMap.get(id) || stat?.name;
    if (!name) return null;
    const parts: string[] = [];
    if (stat) {
      if (stat.runs > 0 || stat.ballsFaced > 0) {
        parts.push(`${stat.runs} (${stat.ballsFaced})`);
      }
      if (stat.wickets > 0 || stat.ballsBowled > 0 || stat.overs > 0) {
        parts.push(`${stat.wickets}/${stat.runsConceded}`);
      }
    }
    return { name, line: parts.join("   ·   "), team: stat?.team };
  }, [match, allStats, playersMap]);

  // --- Derived: meta --------------------------------------------------------
  const meta = useMemo(() => {
    if (!match) return null;
    const toDate = (ts?: any) =>
      ts && typeof ts.toDate === "function" ? ts.toDate() : null;
    const start = toDate(match.startDateTime);
    const end = toDate(match.endDateTime);
    let duration: string | null = null;
    if (start && end) {
      const diff = end.getTime() - start.getTime();
      if (diff > 0) {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }
    }
    const tossTeam = match.tossWin === "team1" ? team1 : team2;
    const toss = `${tossTeam} won the toss, chose to ${
      match.choose === "batting" ? "bat" : "bowl"
    }`;
    const bits = [
      match.overs ? `${match.overs} overs` : null,
      start ? start.toLocaleDateString() : null,
      duration,
    ].filter(Boolean) as string[];
    return { line: bits.join("   ·   "), toss };
  }, [match, team1, team2]);

  const winnerSide = match?.winner ?? null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.screen }]}
      contentContainerStyle={{
        padding: 14,
        paddingBottom: 40 + insets.bottom,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ---- Scoreboard panel (the thesis: who won, by how much) ---- */}
      <View style={[styles.panel, { backgroundColor: c.panel }]}>
        {statusLabel && (
          <View style={styles.panelTop}>
            {status === "live" && (
              <View style={[styles.liveDot, { backgroundColor: c.accent }]} />
            )}
            <Text
              style={[
                styles.panelEyebrow,
                { color: status === "live" ? c.accent : c.panelInkSoft },
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        )}

        <HeroTeamRow
          name={team1 as string}
          totals={team1Totals}
          isWinner={winnerSide === "team1"}
          c={c}
        />
        <View style={[styles.panelDivider, { backgroundColor: c.panelRule }]} />
        <HeroTeamRow
          name={team2 as string}
          totals={team2Totals}
          isWinner={winnerSide === "team2"}
          c={c}
        />

        {!!resultLine && (
          <View style={[styles.resultWrap, { borderTopColor: c.panelRule }]}>
            <Text style={[styles.resultText, { color: c.panelInk }]}>
              {resultLine}
            </Text>
          </View>
        )}
      </View>

      {/* ---- Meta ---- */}
      {meta && (
        <View style={styles.metaWrap}>
          {!!meta.line && (
            <Text style={[styles.metaLine, { color: c.inkFaint }]}>
              {meta.line}
            </Text>
          )}
          <Text style={[styles.metaToss, { color: c.inkFaint }]}>
            {meta.toss}
          </Text>
        </View>
      )}

      {/* ---- Player of the Match ---- */}
      {motm && (
        <View
          style={[
            styles.motmCard,
            { backgroundColor: c.surface, borderColor: c.rule },
          ]}
        >
          <View style={[styles.motmRule, { backgroundColor: c.accent }]} />
          <Ionicons
            name="ribbon-outline"
            size={20}
            color={c.accent}
            style={{ marginRight: 10 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.motmEyebrow, { color: c.accent }]}>
              PLAYER OF THE MATCH
            </Text>
            <Text
              style={[styles.motmName, { color: c.ink }]}
              numberOfLines={1}
            >
              {motm.name}
            </Text>
            {!!motm.line && (
              <Text style={[styles.motmLine, { color: c.inkSoft }]}>
                {motm.line}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* ---- Innings scorecards ----
           An innings card pairs a team's batting with the *opposition's*
           bowling/fielding: team1 batted against team2's bowlers, and vice
           versa. */}
      <InningsCard
        team={team1 as string}
        totals={team1Totals}
        batting={battingRecordsTeamA}
        bowling={bowlingRecordsTeamB}
        c={c}
        playersMap={playersMap}
        getDismissalStatus={getDismissalStatus}
      />
      <InningsCard
        team={team2 as string}
        totals={team2Totals}
        batting={battingRecordsTeamB}
        bowling={bowlingRecordsTeamA}
        c={c}
        playersMap={playersMap}
        getDismissalStatus={getDismissalStatus}
      />

      {/* ---- Over by over ---- */}
      {(team1Overs.length > 0 || team2Overs.length > 0) && (
        <SectionTitle text="Over by over" c={c} />
      )}
      {team1Overs.length > 0 && (
        <View style={styles.overCardWrap}>
          <ScoreBoard
            totalScore={team1Totals?.totalRuns ?? 0}
            wickets={team1Totals?.totalWickets ?? 0}
            overs={team1Totals?.totalOvers ?? 0}
            balls={team1Totals?.totalBalls ?? 0}
            scorePerInning={team1Overs}
            teamName={team1 as string}
          />
        </View>
      )}
      {team2Overs.length > 0 && (
        <View style={styles.overCardWrap}>
          <ScoreBoard
            totalScore={team2Totals?.totalRuns ?? 0}
            wickets={team2Totals?.totalWickets ?? 0}
            overs={team2Totals?.totalOvers ?? 0}
            balls={team2Totals?.totalBalls ?? 0}
            scorePerInning={team2Overs}
            teamName={team2 as string}
          />
        </View>
      )}

      {/* ---- Administrative actions (kept out of the way, at the end) ---- */}
      <View style={[styles.actionsDivider, { backgroundColor: c.rule }]} />

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: c.btn }]}
        onPress={handleFetchManOfTheMatch}
        disabled={isPosting}
        activeOpacity={0.85}
      >
        {isPosting ? (
          <ActivityIndicator color={c.panelInk} />
        ) : (
          <Text style={[styles.primaryBtnText, { color: c.panelInk }]}>
            Suggest Player of the Match
          </Text>
        )}
      </TouchableOpacity>

      {status === "completed" && (
        <>
          <TouchableOpacity
            style={[styles.ghostBtn, { borderColor: c.rule }]}
            onPress={() =>
              router.push({
                pathname: "/editMatch",
                params: { matchId, team1, team2 },
              })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={c.inkSoft} />
            <Text style={[styles.ghostBtnText, { color: c.inkSoft }]}>
              Edit match data
            </Text>
          </TouchableOpacity>
          <Text style={[styles.ghostCaption, { color: c.inkFaint }]}>
            Fix a wrongly recorded batsman or bowler.
          </Text>
        </>
      )}
    </ScrollView>
  );
};

// --- Hero team row ----------------------------------------------------------
const HeroTeamRow = ({
  name,
  totals,
  isWinner,
  c,
}: {
  name: string;
  totals: currentTotalScore | null;
  isWinner: boolean;
  c: Theme;
}) => (
  <View style={styles.heroTeamRow}>
    <View
      style={[
        styles.heroWinBar,
        { backgroundColor: isWinner ? c.accent : "transparent" },
      ]}
    />
    <View style={styles.heroTeamLeft}>
      <Text style={[styles.heroTeamName, { color: c.panelInk }]} numberOfLines={1}>
        {name}
      </Text>
      {isWinner && (
        <View style={[styles.wonTag, { backgroundColor: c.accent }]}>
          <Text style={styles.wonTagText}>WON</Text>
        </View>
      )}
    </View>
    <View style={styles.heroScoreWrap}>
      <Text style={[styles.heroScore, { color: c.panelInk }]}>
        {totals?.totalRuns ?? 0}
        <Text style={[styles.heroScoreWkts, { color: c.panelInkSoft }]}>
          /{totals?.totalWickets ?? 0}
        </Text>
      </Text>
      <Text style={[styles.heroOvers, { color: c.panelInkSoft }]}>
        ({totals?.totalOvers ?? 0}.{totals?.totalBalls ?? 0})
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ---- Scoreboard panel ----
  panel: {
    borderRadius: 12,
    padding: 16,
    paddingTop: 14,
  },
  panelTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  panelEyebrow: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 2,
  },
  heroTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  heroWinBar: {
    width: 3,
    height: 30,
    borderRadius: 2,
    marginRight: 12,
  },
  heroTeamLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  heroTeamName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  wonTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  wonTagText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  heroScoreWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
  },
  heroScore: {
    fontSize: 27,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },
  heroScoreWkts: {
    fontSize: 18,
    fontWeight: "700",
  },
  heroOvers: {
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  panelDivider: {
    height: 1,
    marginVertical: 5,
  },
  resultWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 11,
  },
  resultText: {
    fontSize: 13.5,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  // ---- Meta ----
  metaWrap: {
    marginTop: 12,
    marginLeft: 2,
    gap: 4,
  },
  metaLine: {
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 0.2,
    fontVariant: ["tabular-nums"],
  },
  metaToss: {
    fontSize: 12.5,
    fontWeight: "500",
  },

  // ---- Player of the Match ----
  motmCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 13,
    paddingRight: 14,
    paddingLeft: 16,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  motmRule: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  motmEyebrow: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  motmName: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 3,
    letterSpacing: 0.2,
  },
  motmLine: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },

  // ---- Over by over ----
  overCardWrap: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
  },

  // ---- Actions ----
  actionsDivider: {
    height: 1,
    marginTop: 26,
    marginBottom: 16,
  },
  primaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  ghostBtnText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  ghostCaption: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
  },
});

export default MatchSummary;
