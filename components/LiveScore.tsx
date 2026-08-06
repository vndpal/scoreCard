import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
  Animated,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppContext } from "@/context/AppContext";
import ScoreBoard from "@/components/ScoreBoard";
import Menu from "@/components/navigation/Menu";
import LivePlayersStrip from "@/components/scorecard/LivePlayersStrip";
import {
  makeAppTheme,
  Theme,
  SectionTitle,
  InningsCard,
} from "@/components/scorecard/ScorecardTables";
import { buildDismissalMap, makeGetDismissalStatus } from "@/utils/dismissals";
import { useLiveMatch } from "@/hooks/useLiveMatch";
import { getMatchResultText } from "@/utils/getMatchResultText";
import { currentTotalScore } from "@/types/currentTotalScore";
import { playerStats } from "@/types/playerStats";

const EMPTY_TOTALS: currentTotalScore = {
  totalRuns: 0,
  totalWickets: 0,
  totalOvers: 0,
  totalBalls: 0,
};

/** team1 always bats first in this data model (see MatchScoreBar). */
type TeamKey = "team1" | "team2";

const sortByRuns = (a: playerStats, b: playerStats) => b.runs - a.runs;
const sortByWickets = (a: playerStats, b: playerStats) =>
  b.wickets - a.wickets || b.ballsBowled - a.ballsBowled;
const contributedWithBallOrField = (x: playerStats) =>
  x.wickets > 0 ||
  x.ballsBowled > 0 ||
  x.overs > 0 ||
  (x.catches || 0) > 0 ||
  (x.stumpings || 0) > 0 ||
  (x.runOuts || 0) > 0;

const legalBallsOf = (t: currentTotalScore) => t.totalOvers * 6 + t.totalBalls;

const runRate = (t: currentTotalScore) => {
  const balls = legalBallsOf(t);
  return balls > 0 ? (t.totalRuns / (balls / 6)).toFixed(2) : "0.00";
};

/**
 * Read-only spectator view of a live match. Writes nothing, ever — the one
 * button that changes anything hands off to the scoring screen.
 */
const LiveScore = ({
  /**
   * Rendered as the Scorecard tab rather than as its own route. The tabs
   * navigator then supplies the bottom bar, the safe-area padding and the exit
   * confirm, so this screen leaves all three alone.
   */
  embedded = false,
}: {
  embedded?: boolean;
}) => {
  const { matchId: matchIdParam } = useLocalSearchParams();
  const {
    currentTheme,
    currentSettings,
    liveMatchIdOnLaunch,
    entryMode,
    setEntryMode,
  } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = currentTheme === "dark";
  const c = useMemo(() => makeAppTheme(isDark), [isDark]);

  // The app's slide-in menu, reused verbatim — this screen sits outside the
  // tabs navigator, so nothing else here can reach the other sections.
  const [menuVisible, setMenuVisible] = useState(false);

  const matchId = (matchIdParam as string) || liveMatchIdOnLaunch;

  const {
    match,
    inning1,
    inning2,
    playerStats: stats,
    playersMap,
    loading,
    error,
    lastUpdatedAt,
  } = useLiveMatch(matchId);

  // Only when this screen stands on its own: embedded, the tabs layout already
  // owns the exit confirm and would fire a second alert behind this one.
  useFocusEffect(
    useCallback(() => {
      if (embedded) return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (menuVisible) {
          setMenuVisible(false);
          return true;
        }
        if (router.canGoBack()) return false;
        Alert.alert("Exit App", "Are you sure you want to exit the app?", [
          { text: "Cancel", onPress: () => null, style: "cancel" },
          { text: "YES", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      });
      return () => sub.remove();
    }, [router, menuVisible, embedded])
  );

  const isFirstInning = match?.isFirstInning !== false;
  const isLive = match?.status === "live";
  const quickMatch = match?.quickMatch === true;

  const team1Totals = match?.currentScore?.team1 ?? EMPTY_TOTALS;
  const team2Totals = match?.currentScore?.team2 ?? EMPTY_TOTALS;

  const battingKey: TeamKey = isFirstInning ? "team1" : "team2";
  // Null until the user taps a tab, so the view keeps following the innings in
  // progress on its own — and stops the moment they choose for themselves.
  const [pickedTeam, setPickedTeam] = useState<TeamKey | null>(null);
  const activeKey = pickedTeam ?? battingKey;

  const dismissalMap = useMemo(
    () => buildDismissalMap(inning1, inning2),
    [inning1, inning2]
  );
  const getDismissalStatus = useMemo(
    () => makeGetDismissalStatus(dismissalMap),
    [dismissalMap]
  );

  const records = useMemo(() => {
    const forTeam = (team?: string) => stats.filter((s) => s.team === team);
    const a = forTeam(match?.team1);
    const b = forTeam(match?.team2);
    return {
      battingA: [...a].sort(sortByRuns),
      bowlingA: a.filter(contributedWithBallOrField).sort(sortByWickets),
      battingB: [...b].sort(sortByRuns),
      bowlingB: b.filter(contributedWithBallOrField).sort(sortByWickets),
    };
  }, [stats, match?.team1, match?.team2]);

  // Who is at the crease, read off the newest delivery of the innings in
  // progress — the same reconstruction the scoring screen does on reload, so
  // both screens agree.
  const atCrease = useMemo(() => {
    if (!isLive) return { striker: undefined, nonStriker: undefined, bowler: undefined };
    const overs = isFirstInning ? inning1 : inning2;
    const latestBall = overs[0]?.[0];
    if (!latestBall)
      return { striker: undefined, nonStriker: undefined, bowler: undefined };
    return {
      striker: latestBall.isWicket ? undefined : latestBall.strikerBatter,
      nonStriker: latestBall.nonStrikerBatter,
      bowler: latestBall.isOverEnd ? undefined : latestBall.bowler,
    };
  }, [isLive, isFirstInning, inning1, inning2]);

  // Embedded, `entryMode` alone swaps this screen for the scoring one — the tab
  // simply re-renders. Standalone, navigate only *after* entryMode has landed in
  // context, so the Scorecard tab reads the new value on its first render.
  const [switching, setSwitching] = useState(false);
  const handleSwitchToEntry = () => {
    setEntryMode(true);
    setSwitching(true);
  };
  useEffect(() => {
    if (switching && entryMode && !embedded) router.replace("/");
  }, [switching, entryMode, embedded, router]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.screen }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={[styles.center, { backgroundColor: c.screen }]}>
        <Text style={[styles.emptyText, { color: c.inkSoft }]}>
          No live match to show.
        </Text>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: c.accentFill,
              flex: 0,
              marginTop: 18,
              paddingHorizontal: 22,
            },
          ]}
          onPress={handleSwitchToEntry}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Start scoring</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const teamName = (k: TeamKey) =>
    k === "team1"
      ? match.team1Fullname || match.team1
      : match.team2Fullname || match.team2;
  const teamShort = (k: TeamKey) =>
    k === "team1"
      ? (match.team1ShortName ?? match.team1)
      : (match.team2ShortName ?? match.team2);
  const totalsOf = (k: TeamKey) => (k === "team1" ? team1Totals : team2Totals);
  const inningOf = (k: TeamKey) => (k === "team1" ? inning1 : inning2);
  const battingOf = (k: TeamKey) =>
    k === "team1" ? records.battingA : records.battingB;
  // A team bats against the *opposition's* bowlers.
  const bowlingAgainst = (k: TeamKey) =>
    k === "team1" ? records.bowlingB : records.bowlingA;

  const isCompleted = match.status === "completed";
  const statusLabel = isCompleted
    ? "RESULT"
    : (match.status ?? "").toUpperCase();
  const resultLine = isCompleted
    ? getMatchResultText(match, team1Totals, team2Totals)
    : null;

  // Header context line — no extra reads, just what the match doc already has.
  const matchLabel = `T${match.overs} · ${teamShort("team1")} v ${teamShort("team2")}`;

  const battingTotals = totalsOf(battingKey);
  const chase =
    isLive && !isFirstInning
      ? (() => {
          const need = team1Totals.totalRuns - team2Totals.totalRuns + 1;
          const ballsLeft = match.overs * 6 - legalBallsOf(team2Totals);
          return {
            need,
            ballsLeft,
            rrr:
              ballsLeft > 0 ? (need / (ballsLeft / 6)).toFixed(2) : null,
          };
        })()
      : null;

  const activeOvers = inningOf(activeKey);
  const showCrease =
    isLive &&
    activeKey === battingKey &&
    !quickMatch &&
    !!(atCrease.striker || atCrease.nonStriker || atCrease.bowler);

  return (
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      {/* The headline panel now follows the theme, so the status bar icons on
          top of it have to as well. */}
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ---- Fixed headline panel ------------------------------------------ */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: c.panel,
            borderBottomColor: c.panelRule,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerTopLeft}>
            {router.canGoBack() && (
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.6}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={c.panelInkSoft}
                />
              </TouchableOpacity>
            )}
            <Text
              style={[styles.eyebrow, { color: c.panelInkSoft }]}
              numberOfLines={1}
            >
              {matchLabel}
            </Text>
          </View>
          <View style={styles.headerTopRight}>
            {isLive ? (
              <View style={styles.liveWrap}>
                <LiveDot color={c.live} />
                <Text style={[styles.liveLabel, { color: c.live }]}>LIVE</Text>
              </View>
            ) : (
              <Text style={[styles.liveLabel, { color: c.panelInkSoft }]}>
                {statusLabel}
              </Text>
            )}
            {isLive && (
              <UpdatedAgo lastUpdatedAt={lastUpdatedAt} color={c.panelInkSoft} />
            )}
          </View>
        </View>

        {isLive ? (
          <View style={styles.headline}>
            <View style={styles.headlineLeft}>
              <View style={styles.battingNameRow}>
                <Text
                  style={[styles.battingTeam, { color: c.panelInk }]}
                  numberOfLines={1}
                >
                  {teamName(battingKey)}
                </Text>
                <View style={[styles.pill, { backgroundColor: c.accentFill }]}>
                  <Text style={styles.pillText}>BATTING</Text>
                </View>
              </View>
              <View style={styles.scoreRow}>
                <Text style={[styles.bigScore, { color: c.panelInk }]}>
                  {battingTotals.totalRuns}
                  <Text style={[styles.bigWickets, { color: c.panelInkSoft }]}>
                    /{battingTotals.totalWickets}
                  </Text>
                </Text>
                <Text style={[styles.bigOvers, { color: c.panelInkSoft }]}>
                  ({battingTotals.totalOvers}.{battingTotals.totalBalls}/
                  {match.overs} ov)
                </Text>
              </View>
              <Text style={[styles.crr, { color: c.panelInkSoft }]}>
                CRR {runRate(battingTotals)}
              </Text>
            </View>

            {!!chase && (
              <View style={styles.headlineRight}>
                <Text
                  style={[styles.needText, { color: c.panelInk }]}
                  numberOfLines={1}
                >
                  Need {chase.need} off {chase.ballsLeft}
                </Text>
                {!!chase.rrr && (
                  <Text style={[styles.rrrText, { color: c.accent }]}>
                    RRR {chase.rrr}
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.finalWrap}>
            <FinalRow
              name={teamName("team1")}
              totals={team1Totals}
              isWinner={match.winner === "team1"}
              c={c}
            />
            <FinalRow
              name={teamName("team2")}
              totals={team2Totals}
              isWinner={match.winner === "team2"}
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
        )}
      </View>

      {/* ---- Scrolling detail ---------------------------------------------- */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Offline mode kills the feed entirely; say so loudly */}
        {currentSettings?.offlineMode && (
          <Banner
            c={c}
            icon="cloud-offline-outline"
            text="Offline mode is ON — live updates are paused."
          />
        )}
        {!!error && <Banner c={c} icon="warning-outline" text={error} />}

        {/* ---- Team switch ---- */}
        <View style={[styles.tabTrack, { backgroundColor: c.btn }]}>
          {(["team1", "team2"] as TeamKey[]).map((k) => {
            const active = k === activeKey;
            return (
              <TouchableOpacity
                key={k}
                style={[styles.tab, active && { backgroundColor: c.accentFill }]}
                onPress={() => setPickedTeam(k)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? "#ffffff" : c.inkSoft },
                    active && styles.tabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {teamName(k)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ---- At the crease, or where that innings finished ---- */}
        {showCrease ? (
          <LivePlayersStrip
            title="At the crease"
            striker={atCrease.striker}
            nonStriker={atCrease.nonStriker}
            bowler={atCrease.bowler}
            playerStats={stats}
            c={c}
          />
        ) : (
          <InningsSummaryCard
            totals={totalsOf(activeKey)}
            batted={activeOvers.length > 0}
            complete={activeKey === battingKey ? !isLive : true}
            topBatter={battingOf(activeKey)[0]}
            bestBowler={bowlingAgainst(activeKey)[0]}
            playersMap={playersMap}
            c={c}
          />
        )}

        {/* ---- Over by over (horizontal, current over first) ---- */}
        {activeOvers.length > 0 && (
          <>
            <SectionTitle
              text="Overs"
              c={c}
              right={
                activeOvers.length > 1 ? (
                  <Text style={[styles.hint, { color: c.inkFaint }]}>
                    swipe for previous →
                  </Text>
                ) : undefined
              }
            />
            <View style={[styles.overCardWrap, { borderColor: c.rule }]}>
              <ScoreBoard
                totalScore={totalsOf(activeKey).totalRuns}
                wickets={totalsOf(activeKey).totalWickets}
                overs={totalsOf(activeKey).totalOvers}
                balls={totalsOf(activeKey).totalBalls}
                scorePerInning={activeOvers}
                teamName={teamShort(activeKey)}
                isLiveMatch={isLive}
                isActiveInning={activeKey === battingKey}
                showSummary={false}
              />
            </View>
          </>
        )}

        {/* ---- Full scorecard (quickMatch records no player stats) ---- */}
        {!quickMatch && (
          <>
            <SectionTitle text="Scorecard" c={c} />
            <InningsCard
              team={teamName(activeKey)}
              totals={totalsOf(activeKey)}
              batting={battingOf(activeKey)}
              bowling={bowlingAgainst(activeKey)}
              c={c}
              playersMap={playersMap}
              getDismissalStatus={getDismissalStatus}
              collapseDidNotBat
            />
          </>
        )}

        <Text style={[styles.readOnlyNote, { color: c.inkFaint }]}>
          Read-only view · scores update automatically
        </Text>
      </ScrollView>

      {/* ---- Bottom action bar + navigation -------------------------------- */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: c.surface,
            borderTopColor: c.rule,
            // Embedded, the tab bar sits below this and already clears the
            // gesture area.
            paddingBottom: embedded ? 8 : Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View style={styles.actionRow}>
          {isCompleted && (
            <TouchableOpacity
              style={[styles.ghostBtn, { borderColor: c.rule }]}
              onPress={() =>
                router.push({
                  pathname: "/matchSummary",
                  params: {
                    matchId: match.matchId,
                    team1: match.team1,
                    team2: match.team2,
                  },
                })
              }
              activeOpacity={0.75}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={c.inkSoft}
              />
              <Text style={[styles.ghostBtnText, { color: c.inkSoft }]}>
                Summary
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: c.accentFill }]}
            onPress={handleSwitchToEntry}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isLive ? "play" : "create-outline"}
              size={17}
              color="#ffffff"
            />
            <Text style={styles.primaryBtnText}>
              {isLive ? "Start scoring" : "Go to scoring"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Standalone, no tabs navigator mounts behind this screen, so it
            carries its own way out to the rest of the app. Embedded, the real
            tab bar is right below — a second row would just duplicate it. */}
        {!embedded && (
          <View style={[styles.navRow, { borderTopColor: c.rule }]}>
            <NavItem icon="pulse" label="Live" active c={c} />
            <NavItem
              icon="trophy-outline"
              label="Matches"
              c={c}
              onPress={() => router.push("/explore")}
            />
            <NavItem
              icon="stats-chart-outline"
              label="Stats"
              c={c}
              onPress={() => router.push("/playerRecords")}
            />
            <NavItem
              icon="menu-outline"
              label="Menu"
              c={c}
              onPress={() => setMenuVisible(true)}
            />
          </View>
        )}
      </View>

      {!embedded && (
        <Menu visible={menuVisible} hideMenu={() => setMenuVisible(false)} />
      )}
    </View>
  );
};

/** One slot of the bottom navigation row. */
const NavItem = ({
  icon,
  label,
  c,
  onPress,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  c: Theme;
  onPress?: () => void;
  /** The screen you're already on — shown highlighted, and inert. */
  active?: boolean;
}) => (
  <TouchableOpacity
    style={styles.navItem}
    onPress={onPress}
    disabled={active}
    activeOpacity={0.7}
  >
    <Ionicons name={icon} size={20} color={active ? c.accent : c.inkSoft} />
    <Text
      style={[
        styles.navLabel,
        { color: active ? c.accent : c.inkSoft },
        active && styles.navLabelActive,
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

/** Pulsing dot next to the LIVE label — the one animation on the screen. */
const LiveDot = ({ color }: { color: string }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.liveDot, { backgroundColor: color, opacity }]}
    />
  );
};

/** Compact team + score line, used once the match is no longer live. */
const FinalRow = ({
  name,
  totals,
  isWinner,
  c,
}: {
  name: string;
  totals: currentTotalScore;
  isWinner: boolean;
  c: Theme;
}) => (
  <View style={styles.finalRow}>
    <Text
      style={[
        styles.finalName,
        { color: isWinner ? c.panelInk : c.panelInkSoft },
        isWinner && styles.finalNameWin,
      ]}
      numberOfLines={1}
    >
      {name}
    </Text>
    {isWinner && (
      <Ionicons name="trophy" size={12} color={c.win} style={styles.trophy} />
    )}
    <Text style={[styles.finalScore, { color: c.panelInk }]}>
      {totals.totalRuns}
      <Text style={{ color: c.panelInkSoft }}>/{totals.totalWickets}</Text>
      <Text style={[styles.finalOvers, { color: c.panelInkSoft }]}>
        {"  "}({totals.totalOvers}.{totals.totalBalls})
      </Text>
    </Text>
  </View>
);

/**
 * Stands in for the "at the crease" card whenever the selected side isn't the
 * one batting right now — the innings in one card instead of a blank slot.
 */
const InningsSummaryCard = ({
  totals,
  batted,
  complete,
  topBatter,
  bestBowler,
  playersMap,
  c,
}: {
  totals: currentTotalScore;
  /** False when this side hasn't come out to bat at all. */
  batted: boolean;
  complete: boolean;
  topBatter?: playerStats;
  bestBowler?: playerStats;
  playersMap: Map<string, string>;
  c: Theme;
}) => {
  const nameOf = (s: playerStats) => playersMap.get(s.playerId) || s.playerId;

  return (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: c.surface, borderColor: c.rule },
      ]}
    >
      <Text style={[styles.summaryTitle, { color: c.inkFaint }]}>
        {!batted ? "YET TO BAT" : complete ? "INNINGS COMPLETE" : "INNINGS"}
      </Text>
      {batted ? (
        <>
          <Text style={[styles.summaryScore, { color: c.ink }]}>
            {totals.totalRuns}
            <Text style={{ color: c.inkSoft }}>/{totals.totalWickets}</Text>
            <Text style={[styles.summaryOvers, { color: c.inkFaint }]}>
              {"  "}({totals.totalOvers}.{totals.totalBalls} ov)
            </Text>
          </Text>
          {!!topBatter && topBatter.runs > 0 && (
            <View style={[styles.summaryRow, { borderTopColor: c.rule }]}>
              <Text style={[styles.summaryLabel, { color: c.inkSoft }]}>
                Top score
              </Text>
              <Text
                style={[styles.summaryValue, { color: c.ink }]}
                numberOfLines={1}
              >
                {nameOf(topBatter)} · {topBatter.runs} ({topBatter.ballsFaced})
              </Text>
            </View>
          )}
          {!!bestBowler && bestBowler.wickets > 0 && (
            <View style={[styles.summaryRow, { borderTopColor: c.rule }]}>
              <Text style={[styles.summaryLabel, { color: c.inkSoft }]}>
                Best bowling
              </Text>
              <Text
                style={[styles.summaryValue, { color: c.ink }]}
                numberOfLines={1}
              >
                {nameOf(bestBowler)} · {bestBowler.wickets}/
                {bestBowler.runsConceded}
              </Text>
            </View>
          )}
        </>
      ) : (
        <Text style={[styles.summaryEmpty, { color: c.inkFaint }]}>
          This innings hasn&apos;t started yet.
        </Text>
      )}
    </View>
  );
};

/**
 * Owns its own 5s clock so the tick re-renders one <Text> and nothing else —
 * keeping it in LiveScore would re-render the ScoreBoard and the scorecard
 * tables every five seconds, forever.
 */
const UpdatedAgo = ({
  lastUpdatedAt,
  color,
}: {
  lastUpdatedAt: number | null;
  color: string;
}) => {
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => setNow(Date.now()), 5000);
      return () => clearInterval(id);
    }, [])
  );

  if (!lastUpdatedAt) return null;
  const secs = Math.max(0, Math.round((now - lastUpdatedAt) / 1000));
  const label =
    secs < 5
      ? "updated just now"
      : secs < 60
        ? `updated ${secs}s ago`
        : `updated ${Math.floor(secs / 60)}m ago`;

  return <Text style={[styles.updatedText, { color }]}>{label}</Text>;
};

const Banner = ({
  c,
  icon,
  text,
}: {
  c: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) => (
  <View style={[styles.banner, { backgroundColor: c.accentSoft }]}>
    <Ionicons name={icon} size={15} color={c.accent} />
    <Text style={[styles.bannerText, { color: c.accent }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // ---- Header ----
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    // In light mode the panel is a white card on an off-white screen; without
    // this the two run into each other.
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  headerTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    paddingTop: 1,
  },
  headerTopRight: {
    alignItems: "flex-end",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  liveWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  updatedText: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
  },

  // ---- Live headline ----
  headline: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  headlineLeft: {
    flex: 1,
  },
  headlineRight: {
    alignItems: "flex-end",
  },
  battingNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  battingTeam: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillText: {
    color: "#ffffff",
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  bigScore: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"],
  },
  bigWickets: {
    fontSize: 22,
    fontWeight: "700",
  },
  bigOvers: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  crr: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
    fontVariant: ["tabular-nums"],
  },
  needText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  rrrText: {
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },

  // ---- Completed headline ----
  finalWrap: {
    marginTop: 12,
  },
  finalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    gap: 6,
  },
  finalName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  finalNameWin: {
    fontWeight: "800",
  },
  trophy: {
    marginRight: 2,
  },
  finalScore: {
    fontSize: 19,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  finalOvers: {
    fontSize: 12,
    fontWeight: "600",
  },
  resultWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  resultText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  // ---- Scroll body ----
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 26,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },

  // ---- Team switch ----
  tabTrack: {
    flexDirection: "row",
    borderRadius: 11,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  tabTextActive: {
    fontWeight: "800",
  },

  // ---- Innings summary card ----
  summaryCard: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  summaryScore: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
    fontVariant: ["tabular-nums"],
  },
  summaryOvers: {
    fontSize: 12,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  summaryValue: {
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: "700",
    textAlign: "right",
  },
  summaryEmpty: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 6,
  },

  // ---- Over by over ----
  hint: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  overCardWrap: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  readOnlyNote: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 22,
  },

  // ---- Bottom action bar ----
  bottomBar: {
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  ghostBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // ---- Bottom navigation ----
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 7,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 3,
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  navLabelActive: {
    fontWeight: "800",
  },
});

export default LiveScore;
