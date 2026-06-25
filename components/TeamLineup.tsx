import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Menu } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

import TeamSelection from "./TeamSelection";
import PlayerPicker from "./PlayerPicker";
import Loader from "./Loader";

import { player, PlayerRole } from "@/types/player";
import { ROLE_META, getPlayerRole } from "@/constants/playerRoles";
import {
  PlayerStrengthStats,
  computeTeamStrength,
  computeBalance,
} from "@/utils/teamBalance";
import { team } from "@/types/team";
import teams from "@/interfaces/teams";
import { playerStats } from "@/types/playerStats";
import { Player } from "@/firebase/models/Player";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { Team } from "@/firebase/models/Team";
import { TeamPlayerMapping } from "@/firebase/models/TeamPlayerMapping";
import { Match } from "@/firebase/models/Match";
import { useAppContext } from "@/context/AppContext";
import { STORAGE_ITEMS } from "@/constants/StorageItems";

type TeamSlot = "team1" | "team2";
type DragHover = TeamSlot | "remove" | null;
interface DragState {
  playerId: string;
  slot: TeamSlot;
  fingerX: number;
  fingerY: number;
  hover: DragHover;
}
interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TEAM_PALETTE: Record<TeamSlot, string> = {
  team1: "#E85D3C",
  team2: "#2E7D6A",
};

const PALETTE = {
  bg: "#F7F9F8",
  card: "#fff",
  ink: "#1A2421",
  muted: "#6B7571",
  subtle: "#8A938F",
  border: "#EAEFED",
  divider: "#F0F3F1",
  chipBg: "#F4F7F6",
  ctaInk: "#1A2421",
};

interface TeamBalanceBarProps {
  team1: team;
  team2: team;
  team1Players: player[];
  team2Players: player[];
  team1Color: string;
  team2Color: string;
  playerStatsMap: Record<string, PlayerStrengthStats>;
}

const TeamBalanceBar: React.FC<TeamBalanceBarProps> = ({
  team1,
  team2,
  team1Players,
  team2Players,
  team1Color,
  team2Color,
  playerStatsMap,
}) => {
  const { share1, pct1, pct2 } = useMemo(() => {
    const t1 = computeTeamStrength(team1Players, playerStatsMap);
    const t2 = computeTeamStrength(team2Players, playerStatsMap);
    return computeBalance(t1, t2);
  }, [team1Players, team2Players, playerStatsMap]);

  const leftWidthPct = share1 * 100;
  const rightWidthPct = 100 - leftWidthPct;

  return (
    <View style={styles.balanceRoot}>
      <Text style={styles.balanceTitle}>TEAM BALANCE</Text>
      <View style={styles.balanceBar}>
        <View
          style={{
            width: `${leftWidthPct}%`,
            backgroundColor: team1Color,
          }}
        />
        <View
          style={{
            width: `${rightWidthPct}%`,
            backgroundColor: team2Color,
          }}
        />
      </View>
      <View style={styles.balanceLabelRow}>
        <View style={styles.balanceLabelSide}>
          <View
            style={[styles.balanceDot, { backgroundColor: team1Color }]}
          />
          <Text style={styles.balanceTeamName} numberOfLines={1}>
            {team1.teamShortName}
          </Text>
          <Text style={[styles.balancePct, { color: team1Color }]}>
            {pct1}%
          </Text>
        </View>
        <View
          style={[styles.balanceLabelSide, { justifyContent: "flex-end" }]}
        >
          <Text style={[styles.balancePct, { color: team2Color }]}>
            {pct2}%
          </Text>
          <Text style={styles.balanceTeamName} numberOfLines={1}>
            {team2.teamShortName}
          </Text>
          <View
            style={[styles.balanceDot, { backgroundColor: team2Color }]}
          />
        </View>
      </View>
    </View>
  );
};

interface PlayerRowProps {
  player: player;
  slot: TeamSlot;
  teamColor: string;
  isCaptain: boolean;
  role: PlayerRole;
  removable: boolean;
  isShuffling: boolean;
  isDragging: boolean;
  index: number;
  stats?: { sr: number; eco: number };
  onRemove: () => void;
  onMakeCaptain: () => void;
  onSwap: () => void;
  onSetRole: (r: PlayerRole) => void;
  onDragStart: (playerId: string, slot: TeamSlot) => void;
  onDragUpdate: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}

const PlayerRow: React.FC<PlayerRowProps> = ({
  player,
  slot,
  teamColor,
  isCaptain,
  role,
  removable,
  isShuffling,
  isDragging,
  index,
  stats,
  onRemove,
  onMakeCaptain,
  onSwap,
  onSetRole,
  onDragStart,
  onDragUpdate,
  onDragEnd,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = ROLE_META[role];
  const fade = useRef(new Animated.Value(1)).current;
  const translate = useRef(new Animated.Value(0)).current;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activateAfterLongPress(250)
        .onStart(() => {
          onDragStart(player.id, slot);
        })
        .onUpdate((e) => {
          onDragUpdate(e.absoluteX, e.absoluteY);
        })
        .onEnd((e) => {
          onDragEnd(e.absoluteX, e.absoluteY);
        })
        .onFinalize((_e, success) => {
          if (!success) {
            onDragEnd(-1, -1);
          }
        }),
    [player.id, slot, onDragStart, onDragUpdate, onDragEnd],
  );

  useEffect(() => {
    if (!isShuffling) return;
    fade.setValue(0);
    translate.setValue(-8);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 380,
        delay: index * 40,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 380,
        delay: index * 40,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isShuffling, index, fade, translate]);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.row,
          {
            borderColor: PALETTE.border,
            borderLeftColor: isCaptain ? teamColor : PALETTE.border,
            borderLeftWidth: isCaptain ? 3 : 1,
            paddingLeft: isCaptain ? 7 : 8,
            opacity: fade,
            transform: [{ translateY: translate }],
          },
          isDragging && { opacity: 0.35 },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={styles.rowNameLine}>
            <Text style={styles.rowName} numberOfLines={1}>
              {player.name}
            </Text>
            {isCaptain && (
              <View style={[styles.capChip, { backgroundColor: teamColor }]}>
                <Text style={styles.capChipText}>C</Text>
              </View>
            )}
          </View>
          <View style={styles.rowRoleLine}>
            <View style={[styles.roleDot, { backgroundColor: meta.color }]} />
            <Text style={[styles.rowRoleText, { color: meta.color }]}>
              {meta.short}
            </Text>
            <View style={styles.statGroup}>
              <MaterialCommunityIcons
                name="cricket"
                size={11}
                color={PALETTE.subtle}
              />
              <Text style={styles.statValue}>
                {stats && stats.sr > 0
                  ? Math.min(999, Math.round(stats.sr))
                  : "—"}
              </Text>
            </View>
            <View style={styles.statGroup}>
              <MaterialCommunityIcons
                name="tennis-ball"
                size={11}
                color={PALETTE.subtle}
              />
              <Text style={styles.statValue}>
                {stats && stats.eco > 0 ? stats.eco.toFixed(1) : "—"}
              </Text>
            </View>
          </View>
        </View>

        <Menu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          anchor={
            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                requestAnimationFrame(() => setMenuOpen(true));
              }}
              style={styles.moreButton}
              hitSlop={6}
              accessibilityLabel="Player actions"
            >
              <Ionicons name="ellipsis-horizontal" size={14} color="#C4CBC8" />
            </TouchableOpacity>
          }
          contentStyle={styles.menuContent}
        >
          <Menu.Item
            onPress={() => {
              setMenuOpen(false);
              onMakeCaptain();
            }}
            title="Make captain"
            disabled={isCaptain}
            titleStyle={styles.menuItemText}
          />
          <Menu.Item
            onPress={() => {
              setMenuOpen(false);
              onSwap();
            }}
            title="Swap team"
            titleStyle={styles.menuItemText}
          />
          <View style={styles.menuDivider} />
          <Text style={styles.menuSection}>SET ROLE</Text>
          <View style={styles.menuRolePillRow}>
            {(["BAT", "BOWL"] as PlayerRole[]).map((r) => {
              const m = ROLE_META[r];
              const active = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => {
                    setMenuOpen(false);
                    onSetRole(r);
                  }}
                  style={[
                    styles.menuRolePill,
                    {
                      backgroundColor: active ? `${m.color}1A` : "transparent",
                      borderColor: active ? m.color : PALETTE.border,
                    },
                  ]}
                >
                  <Text style={[styles.menuRolePillText, { color: m.color }]}>
                    {m.short}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.menuDivider} />
          {removable ? (
            <Menu.Item
              onPress={() => {
                setMenuOpen(false);
                onRemove();
              }}
              title="Remove"
              titleStyle={[styles.menuItemText, { color: "#C2410C" }]}
            />
          ) : (
            <Menu.Item
              onPress={() => setMenuOpen(false)}
              title="Remove"
              disabled
              titleStyle={[styles.menuItemText, { color: "#C2410C" }]}
            />
          )}
        </Menu>
      </Animated.View>
    </GestureDetector>
  );
};

interface TeamColumnProps {
  team: team;
  slot: TeamSlot;
  teamColor: string;
  players: player[];
  captainId: string | null;
  activePlayerIds: string[];
  isShuffling: boolean;
  draggingId: string | null;
  isDropTarget: boolean;
  playerStatsMap: Record<string, { sr: number; eco: number }>;
  onLayoutBounds: (slot: TeamSlot, b: Bounds) => void;
  onAddPlayer: () => void;
  onRemove: (playerId: string) => void;
  onMakeCaptain: (playerId: string) => void;
  onSwap: (playerId: string) => void;
  onSetRole: (playerId: string, role: PlayerRole) => void;
  onDragStart: (playerId: string, slot: TeamSlot) => void;
  onDragUpdate: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}

const TeamColumn: React.FC<TeamColumnProps> = ({
  team,
  slot,
  teamColor,
  players,
  captainId,
  activePlayerIds,
  isShuffling,
  draggingId,
  isDropTarget,
  playerStatsMap,
  onLayoutBounds,
  onAddPlayer,
  onRemove,
  onMakeCaptain,
  onSwap,
  onSetRole,
  onDragStart,
  onDragUpdate,
  onDragEnd,
}) => {
  const ref = useRef<View>(null);
  const measure = () => {
    ref.current?.measureInWindow((x, y, w, h) => {
      onLayoutBounds(slot, { x, y, w, h });
    });
  };
  return (
    <View
      ref={ref}
      onLayout={measure}
      style={[
        styles.column,
        {
          borderColor: isDropTarget ? teamColor : PALETTE.border,
          ...(isDropTarget
            ? Platform.select({
                ios: {
                  shadowColor: teamColor,
                  shadowOpacity: 0.18,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                },
                android: { elevation: 4 },
              })
            : null),
        },
      ]}
    >
      <LinearGradient
        colors={[teamColor, `${teamColor}E0`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.columnHeader}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.columnHeaderTag}>
            {team.teamShortName} · {players.length} PLAYERS
          </Text>
          <Text style={styles.columnHeaderName} numberOfLines={1}>
            {team.teamName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onAddPlayer}
          style={styles.columnAddButton}
          accessibilityLabel="Add player"
        >
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.columnList}
        contentContainerStyle={{ padding: 5, gap: 4 }}
        showsVerticalScrollIndicator={false}
      >
        {players.length === 0 ? (
          <View style={styles.emptyColumn}>
            <Text style={styles.emptyColumnText}>
              No players yet. Tap + to add.
            </Text>
          </View>
        ) : (
          players.map((p, idx) => (
            <PlayerRow
              key={p.id}
              player={p}
              slot={slot}
              teamColor={teamColor}
              isCaptain={captainId === p.id}
              role={getPlayerRole(p)}
              removable={!activePlayerIds.includes(p.id)}
              isShuffling={isShuffling}
              isDragging={draggingId === p.id}
              index={idx}
              stats={playerStatsMap[p.id]}
              onRemove={() => onRemove(p.id)}
              onMakeCaptain={() => onMakeCaptain(p.id)}
              onSwap={() => onSwap(p.id)}
              onSetRole={(r) => onSetRole(p.id, r)}
              onDragStart={onDragStart}
              onDragUpdate={onDragUpdate}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const TeamLineUp: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { club } = useAppContext();

  const [team1, setTeam1] = useState<team | undefined>();
  const [team2, setTeam2] = useState<team | undefined>();
  const [team1Players, setTeam1Players] = useState<player[]>([]);
  const [team2Players, setTeam2Players] = useState<player[]>([]);
  const [allPlayers, setAllPlayers] = useState<player[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<player[]>([]);
  const [activePlayerIds, setActivePlayerIds] = useState<string[]>([]);
  const [currentMatchId, setCurrentMatchId] = useState("");
  const [currentMatchPlayerStats, setCurrentMatchPlayerStats] = useState<
    playerStats[]
  >([]);
  const [playerStatsMap, setPlayerStatsMap] = useState<
    Record<string, PlayerStrengthStats>
  >({});
  const [pickerFor, setPickerFor] = useState<TeamSlot | null>(null);
  const [teamSelectionVisible, setTeamSelectionVisible] = useState(false);
  const [loader, setLoader] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<{
    playerId: string;
    slot: TeamSlot;
    wasCaptain: boolean;
  } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [captains, setCaptains] = useState<Record<string, string>>({});

  const team1Color = TEAM_PALETTE.team1;
  const team2Color = TEAM_PALETTE.team2;

  // Drag state
  const [drag, setDrag] = useState<DragState | null>(null);
  const columnBoundsRef = useRef<Record<TeamSlot, Bounds | null>>({
    team1: null,
    team2: null,
  });
  const removeZoneBoundsRef = useRef<Bounds | null>(null);

  const setColumnBounds = (slot: TeamSlot, b: Bounds) => {
    columnBoundsRef.current[slot] = b;
  };
  const setRemoveZoneBounds = (b: Bounds) => {
    removeZoneBoundsRef.current = b;
  };

  const computeHover = (x: number, y: number): DragHover => {
    const rz = removeZoneBoundsRef.current;
    if (rz && y >= rz.y && y <= rz.y + rz.h) return "remove";
    // Fallback: bottom strip of screen as remove zone before bounds are measured
    const screenH = Dimensions.get("window").height;
    if (!rz && y >= screenH - 110) return "remove";
    const cols = columnBoundsRef.current;
    for (const slot of ["team1", "team2"] as TeamSlot[]) {
      const b = cols[slot];
      if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        return slot;
      }
    }
    return null;
  };

  const onDragStart = (playerId: string, slot: TeamSlot) => {
    setDrag({ playerId, slot, fingerX: 0, fingerY: 0, hover: null });
  };
  const onDragUpdate = (x: number, y: number) => {
    setDrag((d) =>
      d ? { ...d, fingerX: x, fingerY: y, hover: computeHover(x, y) } : d,
    );
  };
  const onDragEnd = (x: number, y: number) => {
    setDrag((d) => {
      if (!d) return null;
      const cancelled = x < 0 && y < 0;
      const hover = cancelled ? null : computeHover(x, y);
      if (hover === "remove") {
        if (activePlayerIds.includes(d.playerId)) {
          showToast("Player has already played — can't remove");
        } else {
          removePlayer(d.slot, d.playerId);
        }
      } else if (hover && hover !== d.slot) {
        if (activePlayerIds.includes(d.playerId)) {
          showToast("Player has already played — can't swap");
        } else {
          swapPlayer(d.slot, d.playerId);
        }
      }
      return null;
    });
  };

  useEffect(() => {
    (async () => {
      setLoader(true);
      try {
        const teamPlayersMapping = await TeamPlayerMapping.getAllFromClub(
          club.id,
        );
        const playersFromStorage: player[] = await Player.getAllFromClub(
          club.id,
        );
        if (playersFromStorage && playersFromStorage.length > 0) {
          playersFromStorage.sort((a, b) => a.name.localeCompare(b.name));
          setAllPlayers(playersFromStorage);
        }

        try {
          const careerStats = await PlayerCareerStats.getAllFromClub(club.id);
          const map: Record<string, PlayerStrengthStats> = {};
          for (const cs of careerStats || []) {
            map[cs.playerId] = {
              sr: cs.strikeRate ?? 0,
              eco: cs.bowlingEconomy ?? 0,
              runs: cs.runs ?? 0,
              wickets: cs.wickets ?? 0,
              matches: cs.matches ?? 0,
              ballsFaced: cs.ballsFaced ?? 0,
              ballsBowled: cs.ballsBowled ?? 0,
            };
          }
          setPlayerStatsMap(map);
        } catch (e) {
          // career stats are optional for display; ignore failures
        }
        const teamsFromStorage: team[] = await Team.getAllByClubId(club.id);
        let lastMatchTeam1: string | undefined;
        let lastMatchTeam2: string | undefined;

        const lastMatch = await Match.getLatestMatch(club.id);
        if (lastMatch) {
          lastMatchTeam1 = lastMatch.team1;
          lastMatchTeam2 = lastMatch.team2;
        } else if (teamPlayersMapping && teamPlayersMapping.length >= 2) {
          lastMatchTeam1 = teamPlayersMapping[0].team;
          lastMatchTeam2 = teamPlayersMapping[1].team;
        }

        if (lastMatch && lastMatch.status === "live") {
          const playerStatsResult = await PlayerMatchStats.getByMatchId(
            lastMatch.matchId,
          );
          if (playerStatsResult) {
            const matchStats = playerStatsResult.playerMatchStats;
            setCurrentMatchPlayerStats(matchStats);
            const playedPlayers = matchStats
              .filter(
                (x) =>
                  x.ballsBowled > 0 ||
                  x.overs > 0 ||
                  x.extras > 0 ||
                  x.runs > 0 ||
                  x.ballsFaced > 0 ||
                  x.isOut === true,
              )
              .map((x) => x.playerId);
            setActivePlayerIds(playedPlayers);
            setCurrentMatchId(lastMatch.matchId);
          }
        }

        if (
          teamPlayersMapping.length >= 2 &&
          teamsFromStorage &&
          teamsFromStorage.length > 1 &&
          playersFromStorage &&
          playersFromStorage.length > 0
        ) {
          const localTeam1 = teamsFromStorage.find(
            (t) => t.teamInitials === lastMatchTeam1,
          );
          const localTeam2 = teamsFromStorage.find(
            (t) => t.teamInitials === lastMatchTeam2,
          );
          setTeam1(localTeam1);
          setTeam2(localTeam2);

          const t1Players = playersFromStorage.filter((p) =>
            teamPlayersMapping
              .find((m) => m.team === localTeam1?.teamInitials)
              ?.players.map((x) => x.id)
              .includes(p.id),
          );
          const t2Players = playersFromStorage.filter((p) =>
            teamPlayersMapping
              .find((m) => m.team === localTeam2?.teamInitials)
              ?.players.map((x) => x.id)
              .includes(p.id),
          );
          setTeam1Players(t1Players);
          setTeam2Players(t2Players);
          setAvailablePlayers(
            playersFromStorage.filter(
              (p) =>
                !teamPlayersMapping.some((m) =>
                  m.players.map((x) => x.id).includes(p.id),
                ),
            ),
          );
        } else if (playersFromStorage && playersFromStorage.length > 0) {
          setAvailablePlayers(playersFromStorage);
        }

        // Hydrate captains
        try {
          const cRaw = await AsyncStorage.getItem(
            STORAGE_ITEMS.TEAM_SELECTION_CAPTAINS,
          );
          const captainsAll: Record<string, Record<string, string>> = cRaw
            ? JSON.parse(cRaw)
            : {};
          setCaptains(captainsAll[club.id] || {});
        } catch {
          // ignore
        }
      } finally {
        setLoader(false);
      }
    })();
  }, [club.id]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (hasUnsavedChanges) {
          Alert.alert(
            "Unsaved Changes",
            "You have unsaved changes. Do you want to save before leaving?",
            [
              { text: "Cancel", style: "cancel", onPress: () => null },
              {
                text: "Discard",
                style: "destructive",
                onPress: () => router.back(),
              },
              { text: "Save", onPress: saveTeams },
            ],
          );
          return true;
        }
        return false;
      },
    );
    return () => backHandler.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, team1, team2, team1Players, team2Players]);

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const persistCaptains = async (next: Record<string, string>) => {
    try {
      const raw = await AsyncStorage.getItem(
        STORAGE_ITEMS.TEAM_SELECTION_CAPTAINS,
      );
      const all: Record<string, Record<string, string>> = raw
        ? JSON.parse(raw)
        : {};
      all[club.id] = next;
      await AsyncStorage.setItem(
        STORAGE_ITEMS.TEAM_SELECTION_CAPTAINS,
        JSON.stringify(all),
      );
    } catch {
      // ignore
    }
  };

  const updatePlayerInState = (playerId: string, patch: Partial<player>) => {
    const apply = (arr: player[]) =>
      arr.map((p) => (p.id === playerId ? { ...p, ...patch } : p));
    setAllPlayers((arr) => apply(arr));
    setAvailablePlayers((arr) => apply(arr));
    setTeam1Players((arr) => apply(arr));
    setTeam2Players((arr) => apply(arr));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  const teamForSlot = (slot: TeamSlot) => (slot === "team1" ? team1 : team2);
  const playersForSlot = (slot: TeamSlot) =>
    slot === "team1" ? team1Players : team2Players;
  const setPlayersForSlot = (slot: TeamSlot, next: player[]) => {
    if (slot === "team1") setTeam1Players(next);
    else setTeam2Players(next);
  };
  const otherSlot = (slot: TeamSlot): TeamSlot =>
    slot === "team1" ? "team2" : "team1";
  const teamKey = (slot: TeamSlot) => teamForSlot(slot)?.teamInitials;

  const removePlayer = (slot: TeamSlot, playerId: string) => {
    const t = teamForSlot(slot);
    if (!t) return;
    if (activePlayerIds.includes(playerId)) {
      showToast("Player has already played — can't remove");
      return;
    }
    setHasUnsavedChanges(true);
    const wasCaptain = captains[t.teamInitials] === playerId;
    if (wasCaptain) {
      const next = { ...captains };
      delete next[t.teamInitials];
      setCaptains(next);
      persistCaptains(next);
    }
    const current = playersForSlot(slot);
    setPlayersForSlot(
      slot,
      current.filter((p) => p.id !== playerId),
    );
    const removed = allPlayers.find((p) => p.id === playerId);
    if (removed) setAvailablePlayers([...availablePlayers, removed]);

    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoState({ playerId, slot, wasCaptain });
    undoTimer.current = setTimeout(() => setUndoState(null), 5000);
  };

  const performUndo = () => {
    if (!undoState) return;
    const { playerId, slot, wasCaptain } = undoState;
    const t = teamForSlot(slot);
    const restored = allPlayers.find((p) => p.id === playerId);
    if (!t || !restored) {
      setUndoState(null);
      return;
    }
    const current = playersForSlot(slot);
    if (!current.some((p) => p.id === playerId)) {
      setPlayersForSlot(slot, [...current, restored]);
    }
    setAvailablePlayers(availablePlayers.filter((p) => p.id !== playerId));
    if (wasCaptain) {
      const next = { ...captains, [t.teamInitials]: playerId };
      setCaptains(next);
      persistCaptains(next);
    }
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoState(null);
  };

  const addPlayersToSlot = (slot: TeamSlot, ids: string[]) => {
    const t = teamForSlot(slot);
    if (!t) return;
    const current = playersForSlot(slot);
    const currentIds = new Set(current.map((p) => p.id));
    const toAdd = ids
      .map((id) => allPlayers.find((p) => p.id === id))
      .filter((p): p is player => !!p && !currentIds.has(p.id));
    if (toAdd.length === 0) {
      setPickerFor(null);
      return;
    }
    setHasUnsavedChanges(true);
    setPlayersForSlot(slot, [...current, ...toAdd]);
    setAvailablePlayers(availablePlayers.filter((p) => !ids.includes(p.id)));
    setPickerFor(null);
    showToast(`Added ${toAdd.length} to ${t.teamName}`);
  };

  const createAndAddPlayer = async (
    slot: TeamSlot,
    name: string,
    role: PlayerRole,
  ) => {
    const t = teamForSlot(slot);
    if (!t) return;
    const trimmed = name.replace(/\s+/g, " ").trim();
    if (!trimmed) return;
    const exists = await Player.isPlayerExists(trimmed, club.id);
    if (exists) {
      showToast("Player with this name already exists");
      return;
    }
    const created = await Player.create({
      name: trimmed,
      clubId: club.id,
      role,
    });
    if (!created) return;
    try {
      await PlayerCareerStats.create({
        playerId: created.id,
        matches: 0,
        matchesWon: 0,
        innings: 0,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        average: 0,
        notOuts: 0,
        wickets: 0,
        overs: 0,
        ballsBowled: 0,
        extras: 0,
        runsConceded: 0,
        maidens: 0,
        bowlingEconomy: 0,
        foursConceded: 0,
        sixesConceded: 0,
        dotBalls: 0,
        clubId: club.id,
      });
    } catch {
      // career stats failure shouldn't block the picker flow
    }
    const newPlayer: player = {
      id: created.id,
      name: trimmed,
      clubId: club.id,
      role,
    };
    setAllPlayers(
      [...allPlayers, newPlayer].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setPlayersForSlot(slot, [...playersForSlot(slot), newPlayer]);
    setHasUnsavedChanges(true);
    showToast(`Added ${trimmed} to ${t.teamName}`);
  };

  const setCaptain = (slot: TeamSlot, playerId: string) => {
    const t = teamForSlot(slot);
    if (!t) return;
    const next = { ...captains, [t.teamInitials]: playerId };
    setCaptains(next);
    persistCaptains(next);
    const playerName =
      allPlayers.find((p) => p.id === playerId)?.name || "Player";
    showToast(`${playerName} is now captain`);
  };

  const setPlayerRole = (playerId: string, role: PlayerRole) => {
    updatePlayerInState(playerId, { role });
    const playerName =
      allPlayers.find((p) => p.id === playerId)?.name || "Player";
    showToast(`${playerName} → ${ROLE_META[role].label}`);
    Player.update(playerId, { role }).catch(() => {
      showToast("Couldn't save role — try again");
    });
  };

  const swapPlayer = (fromSlot: TeamSlot, playerId: string) => {
    if (activePlayerIds.includes(playerId)) {
      showToast("Player has already played — can't swap");
      return;
    }
    const toSlot = otherSlot(fromSlot);
    const fromTeam = teamForSlot(fromSlot);
    const toTeam = teamForSlot(toSlot);
    if (!fromTeam || !toTeam) return;
    const fromPlayers = playersForSlot(fromSlot);
    const toPlayers = playersForSlot(toSlot);
    const moving = fromPlayers.find((p) => p.id === playerId);
    if (!moving) return;
    setHasUnsavedChanges(true);
    setPlayersForSlot(
      fromSlot,
      fromPlayers.filter((p) => p.id !== playerId),
    );
    setPlayersForSlot(toSlot, [...toPlayers, moving]);
    if (captains[fromTeam.teamInitials] === playerId) {
      const next = { ...captains };
      delete next[fromTeam.teamInitials];
      setCaptains(next);
      persistCaptains(next);
    }
    showToast(`Moved ${moving.name} → ${toTeam.teamName}`);
  };

  const randomizeTeams = () => {
    if (currentMatchId) return;
    setIsShuffling(true);
    setHasUnsavedChanges(true);
    setTimeout(() => {
      const pool = [...allPlayers];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const half = Math.ceil(pool.length / 2);
      setTeam1Players(pool.slice(0, half));
      setTeam2Players(pool.slice(half));
      setAvailablePlayers([]);
      // Reset captains for both teams (no auto-assign)
      const next = { ...captains };
      if (team1) delete next[team1.teamInitials];
      if (team2) delete next[team2.teamInitials];
      setCaptains(next);
      persistCaptains(next);
      showToast("Teams randomized");
    }, 300);
    setTimeout(() => setIsShuffling(false), 1300);
  };

  const teamSelectionSubmit = async (values: teams) => {
    setLoader(true);
    setTeam1(values.team1);
    setTeam2(values.team2);
    const teamPlayersMapping = await TeamPlayerMapping.getAllFromClub(club.id);
    const playersFromStorage: player[] = await Player.getAllFromClub(club.id);
    setTeam1Players(
      playersFromStorage.filter((p) =>
        teamPlayersMapping
          .find((m) => m.team === values.team1?.teamInitials)
          ?.players.map((x) => x.id)
          .includes(p.id),
      ),
    );
    setTeam2Players(
      playersFromStorage.filter((p) =>
        teamPlayersMapping
          .find((m) => m.team === values.team2?.teamInitials)
          ?.players.map((x) => x.id)
          .includes(p.id),
      ),
    );
    setAvailablePlayers(
      playersFromStorage.filter(
        (p) =>
          !teamPlayersMapping.some((m) =>
            m.players.map((x) => x.id).includes(p.id),
          ),
      ),
    );
    setLoader(false);
  };

  const saveTeams = async () => {
    if (!team1 || !team2) return;
    if (Math.abs(team1Players.length - team2Players.length) > 1) {
      Alert.alert("Teams should have equal or one player difference");
      return;
    }
    if (team1Players.length === 0 || team2Players.length === 0) {
      Alert.alert("Add players to the teams before saving");
      return;
    }

    await TeamPlayerMapping.createOrUpdate(
      team1.teamInitials,
      club.id,
      team1Players,
    );
    await TeamPlayerMapping.createOrUpdate(
      team2.teamInitials,
      club.id,
      team2Players,
    );

    if (currentMatchId !== "") {
      let updatedLiveMatchPlayerStats: playerStats[] = currentMatchPlayerStats;
      const stamp = (p: player, slotInitials: string) => {
        const existing = updatedLiveMatchPlayerStats.find(
          (s) => s.playerId === p.id,
        );
        if (!existing) {
          updatedLiveMatchPlayerStats.push({
            playerId: p.id,
            name: p.name,
            runs: 0,
            ballsFaced: 0,
            fours: 0,
            sixes: 0,
            ballsBowled: 0,
            runsConceded: 0,
            wickets: 0,
            overs: 0,
            extras: 0,
            isOut: false,
            team: slotInitials,
            strikeRate: 0,
            average: 0,
            foursConceded: 0,
            sixesConceded: 0,
            maidens: 0,
            bowlingEconomy: 0,
            dotBalls: 0,
          });
        } else {
          existing.team = slotInitials;
        }
      };
      for (const p of team1Players) {
        if (!activePlayerIds.includes(p.id)) stamp(p, team1.teamInitials);
      }
      for (const p of team2Players) {
        if (!activePlayerIds.includes(p.id)) stamp(p, team2.teamInitials);
      }
      const allIds = new Set(
        [...team1Players, ...team2Players].map((p) => p.id),
      );
      updatedLiveMatchPlayerStats = updatedLiveMatchPlayerStats.filter((x) =>
        allIds.has(x.playerId),
      );

      await PlayerMatchStats.update(currentMatchId, {
        matchId: currentMatchId,
        playerMatchStats: updatedLiveMatchPlayerStats,
      });
    }

    setHasUnsavedChanges(false);
    if (currentMatchId !== "") router.push("/");
    else router.back();
  };

  const totalPlayers = team1Players.length + team2Players.length;
  const startMatchDisabled = !team1 || !team2;

  const sortPlayers = (players: player[]): player[] => {
    const roleRank: Record<PlayerRole, number> = { BAT: 0, BOWL: 1 };
    return [...players].sort((a, b) => {
      const ra = roleRank[getPlayerRole(a)];
      const rb = roleRank[getPlayerRole(b)];
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  };
  const sortedTeam1Players = useMemo(
    () => sortPlayers(team1Players),
    [team1Players],
  );
  const sortedTeam2Players = useMemo(
    () => sortPlayers(team2Players),
    [team2Players],
  );

  const draggingPlayer = drag
    ? allPlayers.find((p) => p.id === drag.playerId)
    : null;
  const draggingTeamColor = drag ? TEAM_PALETTE[drag.slot] : team1Color;

  const removeZoneRef = useRef<View>(null);
  const measureRemoveZone = () => {
    removeZoneRef.current?.measureInWindow((x, y, w, h) => {
      setRemoveZoneBounds({ x, y, w, h });
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={[
          styles.root,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        {/* Header */}
        <View style={styles.appHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBack}
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={20} color={PALETTE.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Selection</Text>
          <View style={styles.headerCount}>
            <Ionicons name="people-outline" size={13} color={PALETTE.ink} />
            <Text style={styles.headerCountText}>{totalPlayers}</Text>
          </View>
        </View>

        {team1 && team2 && (
          <TeamBalanceBar
            team1={team1}
            team2={team2}
            team1Players={sortedTeam1Players}
            team2Players={sortedTeam2Players}
            team1Color={team1Color}
            team2Color={team2Color}
            playerStatsMap={playerStatsMap}
          />
        )}

        {/* Columns */}
        {team1 && team2 ? (
          <View style={styles.columns}>
            <TeamColumn
              team={team1}
              slot="team1"
              teamColor={team1Color}
              players={sortedTeam1Players}
              captainId={captains[team1.teamInitials] || null}
              activePlayerIds={activePlayerIds}
              isShuffling={isShuffling}
              draggingId={drag?.playerId || null}
              isDropTarget={
                !!drag && drag.hover === "team1" && drag.slot !== "team1"
              }
              playerStatsMap={playerStatsMap}
              onLayoutBounds={setColumnBounds}
              onAddPlayer={() => setPickerFor("team1")}
              onRemove={(id) => removePlayer("team1", id)}
              onMakeCaptain={(id) => setCaptain("team1", id)}
              onSwap={(id) => swapPlayer("team1", id)}
              onSetRole={(id, r) => setPlayerRole(id, r)}
              onDragStart={onDragStart}
              onDragUpdate={onDragUpdate}
              onDragEnd={onDragEnd}
            />
            <TeamColumn
              team={team2}
              slot="team2"
              teamColor={team2Color}
              players={sortedTeam2Players}
              captainId={captains[team2.teamInitials] || null}
              activePlayerIds={activePlayerIds}
              isShuffling={isShuffling}
              draggingId={drag?.playerId || null}
              isDropTarget={
                !!drag && drag.hover === "team2" && drag.slot !== "team2"
              }
              playerStatsMap={playerStatsMap}
              onLayoutBounds={setColumnBounds}
              onAddPlayer={() => setPickerFor("team2")}
              onRemove={(id) => removePlayer("team2", id)}
              onMakeCaptain={(id) => setCaptain("team2", id)}
              onSwap={(id) => swapPlayer("team2", id)}
              onSetRole={(id, r) => setPlayerRole(id, r)}
              onDragStart={onDragStart}
              onDragUpdate={onDragUpdate}
              onDragEnd={onDragEnd}
            />
          </View>
        ) : (
          <View style={styles.emptyTeams}>
            <Text style={styles.emptyTeamsText}>
              Pick two teams to begin selecting players.
            </Text>
            <TouchableOpacity
              onPress={() => setTeamSelectionVisible(true)}
              style={styles.emptyTeamsCta}
            >
              <Ionicons name="people" size={16} color="#fff" />
              <Text style={styles.emptyTeamsCtaText}>Choose teams</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action bar / drop-to-remove zone */}
        {drag ? (
          <View
            ref={removeZoneRef}
            onLayout={measureRemoveZone}
            style={[
              styles.removeZone,
              {
                backgroundColor:
                  drag.hover === "remove" ? "#FEE4E2" : "#FFF5F4",
                borderTopColor: drag.hover === "remove" ? "#C2410C" : "#F4B5A8",
                borderTopWidth: 2,
                borderStyle: drag.hover === "remove" ? "solid" : "dashed",
              },
            ]}
          >
            <View
              style={[
                styles.removeIconWrap,
                {
                  backgroundColor:
                    drag.hover === "remove"
                      ? "#C2410C"
                      : "rgba(194,65,12,0.15)",
                  transform: [{ scale: drag.hover === "remove" ? 1.1 : 1 }],
                },
              ]}
            >
              <Ionicons
                name="trash"
                size={18}
                color={drag.hover === "remove" ? "#fff" : "#C2410C"}
              />
            </View>
            <View>
              <Text
                style={[
                  styles.removeTitle,
                  { color: drag.hover === "remove" ? "#9A2E10" : "#C2410C" },
                ]}
              >
                {drag.hover === "remove"
                  ? "Release to remove"
                  : "Drop here to remove"}
              </Text>
              <Text style={styles.removeSub}>
                Player will be removed from selection
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.actionBar}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={randomizeTeams}
                disabled={
                  isShuffling || !!currentMatchId || allPlayers.length === 0
                }
                style={[
                  styles.secondaryButton,
                  (isShuffling ||
                    !!currentMatchId ||
                    allPlayers.length === 0) &&
                    styles.disabled,
                ]}
              >
                <Ionicons name="shuffle" size={14} color={PALETTE.ink} />
                <Text style={styles.secondaryText}>Randomize</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTeamSelectionVisible(true)}
                disabled={!!currentMatchId}
                style={[
                  styles.secondaryButton,
                  !!currentMatchId && styles.disabled,
                ]}
              >
                <Ionicons name="people-outline" size={14} color={PALETTE.ink} />
                <Text style={styles.secondaryText}>New Selection</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={saveTeams}
              disabled={startMatchDisabled}
              style={[
                styles.primaryButton,
                startMatchDisabled && styles.disabled,
              ]}
            >
              <Text style={styles.primaryText}>Save Teams · Start Match</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Undo snackbar */}
        {undoState && (
          <View style={styles.snack}>
            <Ionicons name="remove-circle-outline" size={16} color="#FB923C" />
            <Text style={styles.snackText}>
              Removed{" "}
              <Text style={{ fontWeight: "700" }}>
                {allPlayers.find((p) => p.id === undoState.playerId)?.name}
              </Text>
            </Text>
            <TouchableOpacity onPress={performUndo} style={styles.snackUndo}>
              <Ionicons name="arrow-undo" size={14} color="#FDBA74" />
              <Text style={styles.snackUndoText}>Undo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Toast */}
        {toast && !undoState && (
          <View style={styles.toastWrap} pointerEvents="none">
            <View style={styles.toast}>
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          </View>
        )}

        <TeamSelection
          visible={teamSelectionVisible}
          onDismiss={() => setTeamSelectionVisible(false)}
          onSubmit={teamSelectionSubmit}
        />

        <PlayerPicker
          visible={!!pickerFor}
          targetTeamName={
            pickerFor ? teamForSlot(pickerFor)?.teamName || "" : ""
          }
          targetTeamShort={
            pickerFor ? teamForSlot(pickerFor)?.teamShortName || "" : ""
          }
          targetTeamColor={pickerFor ? TEAM_PALETTE[pickerFor] : team1Color}
          pool={availablePlayers}
          onClose={() => setPickerFor(null)}
          onAdd={(ids) => pickerFor && addPlayersToSlot(pickerFor, ids)}
          onCreateNew={(name, role) =>
            pickerFor
              ? createAndAddPlayer(pickerFor, name, role)
              : Promise.resolve()
          }
        />

        {/* Drag ghost */}
        {drag && draggingPlayer && (
          <View
            pointerEvents="none"
            style={[
              styles.ghost,
              {
                left: drag.fingerX - 90,
                top: drag.fingerY - 22,
                borderColor: draggingTeamColor,
              },
            ]}
          >
            <Text style={styles.ghostName} numberOfLines={1}>
              {draggingPlayer.name}
            </Text>
          </View>
        )}

        {loader && <Loader />}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: PALETTE.card,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  headerBack: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: PALETTE.ink,
    letterSpacing: -0.4,
  },
  headerCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: PALETTE.chipBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 999,
  },
  headerCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: PALETTE.ink,
  },

  // Team balance bar
  balanceRoot: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: PALETTE.card,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  balanceTitle: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#A7AFAC",
    marginBottom: 6,
  },
  balanceBar: {
    width: "100%",
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F0F3F1",
    borderWidth: 1,
    borderColor: "#EAEFED",
    overflow: "hidden",
    flexDirection: "row",
  },
  balanceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  balanceLabelSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  balanceTeamName: {
    fontSize: 11,
    fontWeight: "700",
    color: PALETTE.ink,
    letterSpacing: 0.4,
  },
  balancePct: {
    fontSize: 12,
    fontWeight: "800",
  },

  // Columns container
  columns: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10,
    minHeight: 0,
  },
  column: {
    flex: 1,
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#101828",
        shadowOpacity: 0.04,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 1 },
    }),
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  columnHeaderTag: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.78)",
  },
  columnHeaderName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
    marginTop: 1,
  },
  columnAddButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  columnList: {
    flex: 1,
    backgroundColor: "#FAFBFA",
  },

  // Player row
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    paddingLeft: 8,
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderRadius: 6,
  },
  rowNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowName: {
    fontSize: 13,
    fontWeight: "700",
    color: PALETTE.ink,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  capChip: {
    width: 12,
    height: 12,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  capChipText: {
    color: "#fff",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  rowRoleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  rowRoleText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  statGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 8,
  },
  statValue: {
    fontSize: 10,
    fontWeight: "700",
    color: PALETTE.ink,
  },
  moreButton: {
    width: 18,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -2,
  },

  // Menu
  menuContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 180,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: "500",
    color: PALETTE.ink,
  },
  menuDivider: {
    height: 1,
    backgroundColor: PALETTE.divider,
    marginVertical: 4,
    marginHorizontal: 6,
  },
  menuSection: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#A7AFAC",
  },
  menuRolePillRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  menuRolePill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
  },
  menuRolePillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  // Empty states
  emptyColumn: {
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D8DDDB",
    borderRadius: 10,
    margin: 6,
  },
  emptyColumnText: {
    color: "#8A938F",
    fontSize: 12,
  },
  emptyTeams: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyTeamsText: {
    fontSize: 14,
    color: PALETTE.muted,
    textAlign: "center",
  },
  emptyTeamsCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: PALETTE.ctaInk,
    borderRadius: 12,
  },
  emptyTeamsCtaText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Action bar
  actionBar: {
    backgroundColor: PALETTE.card,
    borderTopWidth: 1,
    borderTopColor: PALETTE.border,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: PALETTE.chipBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: PALETTE.ink,
  },
  primaryButton: {
    paddingVertical: 13,
    backgroundColor: PALETTE.ctaInk,
    borderRadius: 12,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#1A2421",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 4 },
    }),
  },
  primaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.55,
  },

  // Snack & toast
  snack: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 110,
    backgroundColor: "#1A2421",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#101828",
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
    }),
  },
  snackText: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
  },
  snackUndo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  snackUndoText: {
    color: "#FDBA74",
    fontSize: 13,
    fontWeight: "700",
  },
  toastWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 110,
    alignItems: "center",
  },
  toast: {
    backgroundColor: "#1A2421",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#101828",
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
    }),
  },
  toastText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },

  // Remove drop zone
  removeZone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  removeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  removeTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  removeSub: {
    fontSize: 11,
    color: "#C2410C",
    opacity: 0.7,
    marginTop: 1,
  },

  // Drag ghost
  ghost: {
    position: "absolute",
    width: 180,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderRadius: 10,
    transform: [{ rotate: "-2deg" }],
    ...Platform.select({
      ios: {
        shadowColor: "#101828",
        shadowOpacity: 0.25,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 12 },
    }),
  },
  ghostName: {
    fontSize: 13,
    fontWeight: "700",
    color: PALETTE.ink,
  },
});

export default TeamLineUp;
