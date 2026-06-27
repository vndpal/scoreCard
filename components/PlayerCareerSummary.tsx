import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { playerCareerStats } from "@/types/playerCareerStats";
import { player } from "@/types/player";
import { useAppContext } from "@/context/AppContext";
import { LinearGradient } from "expo-linear-gradient";
import Loader from "./Loader";
import { Player } from "@/firebase/models/Player";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";
import TournamentDropdown from "./TournamentDropdown";
import { Tournament } from "@/firebase/models/Tournament";
import { PlayerTournamentStats } from "@/firebase/models/PlayerTournamentStats";
import { TeamPlayerMapping } from "@/firebase/models/TeamPlayerMapping";
import { Icon } from "react-native-elements";

type SortDir = "asc" | "desc";
type SortKey = keyof playerCareerStats | "player" | "team" | "fielding";
type SortConfig = { key: SortKey; dir: SortDir };

// Combined fielding tally (catches + run-outs + stumpings) shown as one column.
const fieldingTotal = (row: playerCareerStats) =>
  (row.catches || 0) + (row.runOuts || 0) + (row.stumpings || 0);

type ColumnDef = {
  key: SortKey;
  label: string;
  highlight?: boolean;
  defaultDir: SortDir;
  format?: (value: any, row: playerCareerStats) => string | number;
  numeric?: boolean;
};

const BATTING_COLUMNS: ColumnDef[] = [
  { key: "runs", label: "Runs", highlight: true, defaultDir: "desc", numeric: true },
  { key: "ballsFaced", label: "Balls", defaultDir: "desc", numeric: true },
  { key: "sixes", label: "6s", defaultDir: "desc", numeric: true },
  { key: "fours", label: "4s", defaultDir: "desc", numeric: true },
  {
    key: "strikeRate",
    label: "SR",
    defaultDir: "desc",
    numeric: true,
    format: (v) => (v ? Number(v).toFixed(1) : "-"),
  },
  {
    key: "average",
    label: "Avg",
    defaultDir: "desc",
    numeric: true,
    format: (v) => (v ? Number(v).toFixed(1) : "-"),
  },
  { key: "notOuts", label: "NO", defaultDir: "desc", numeric: true },
  {
    key: "fielding",
    label: "Catches",
    defaultDir: "desc",
    numeric: true,
    format: (_v, row) => fieldingTotal(row),
  },
  {
    key: "matchesWon",
    label: "Wins",
    defaultDir: "desc",
    numeric: true,
    format: (v) => (isNaN(v) ? "-" : v),
  },
  { key: "innings", label: "Inn", defaultDir: "desc", numeric: true },
  { key: "matches", label: "M", defaultDir: "desc", numeric: true },
];

const BOWLING_COLUMNS: ColumnDef[] = [
  { key: "wickets", label: "Wkts", highlight: true, defaultDir: "desc", numeric: true },
  {
    key: "overs",
    label: "Ov",
    defaultDir: "desc",
    numeric: true,
    format: (_, row) =>
      `${row.overs}${row.ballsBowled > 0 ? "." + row.ballsBowled : ""}`,
  },
  { key: "runsConceded", label: "Runs", defaultDir: "asc", numeric: true },
  {
    key: "bowlingEconomy",
    label: "Eco",
    defaultDir: "asc",
    numeric: true,
    format: (v) => (v ? Number(v).toFixed(2) : "-"),
  },
  { key: "extras", label: "Ext", defaultDir: "asc", numeric: true },
  { key: "sixesConceded", label: "6s", defaultDir: "asc", numeric: true },
  { key: "foursConceded", label: "4s", defaultDir: "asc", numeric: true },
  {
    key: "fielding",
    label: "Catches",
    defaultDir: "desc",
    numeric: true,
    format: (_v, row) => fieldingTotal(row),
  },
  {
    key: "matchesWon",
    label: "Wins",
    defaultDir: "desc",
    numeric: true,
    format: (v) => (isNaN(v) ? "-" : v),
  },
  { key: "matches", label: "M", defaultDir: "desc", numeric: true },
];

const PlayerCareerSummary = () => {
  const [careerStats, setCareerStats] = useState<playerCareerStats[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament>();
  const [playersMap, setPlayersMap] = useState<Map<string, string>>(new Map());
  const [playerTeamMap, setPlayerTeamMap] = useState<Map<string, string>>(
    new Map(),
  );
  const [webViewContent, setWebViewContent] = useState<string | null>(null);
  const [isLoader, setIsLoader] = useState<boolean>(false);
  const [battingSort, setBattingSort] = useState<SortConfig>({
    key: "runs",
    dir: "desc",
  });
  const [bowlingSort, setBowlingSort] = useState<SortConfig>({
    key: "wickets",
    dir: "desc",
  });
  const insets = useSafeAreaInsets();

  const { currentTheme } = useAppContext();
  const isDark = currentTheme === "dark";
  const themeStyles = isDark ? darkStyles : lightStyles;
  const { club, currentTournament } = useAppContext();

  useEffect(() => {
    (async () => {
      setIsLoader(true);
      try {
        const currentlySelectedTournament = selectedTournament
          ? selectedTournament.id
          : currentTournament;

        const statsPromise: Promise<playerCareerStats[]> =
          currentlySelectedTournament === "all"
            ? PlayerCareerStats.getAllFromClub(club.id)
            : PlayerTournamentStats.getAllFromTournamentAndClub(
                currentlySelectedTournament,
                club.id,
              );

        const [stats, players, teamMappings] = await Promise.all([
          statsPromise,
          Player.getAllFromClub(club.id),
          TeamPlayerMapping.getAllFromClub(club.id),
        ]);

        const teamMap = new Map<string, string>();
        teamMappings.forEach((mapping) => {
          mapping.players.forEach((p: player) => {
            teamMap.set(p.id.toString(), mapping.team);
          });
        });
        setPlayerTeamMap(teamMap);

        if (stats && players) {
          const pMap = new Map<string, string>();
          players.forEach((p: player) => {
            pMap.set(p.id.toString(), p.name);
          });
          setPlayersMap(pMap);
          setCareerStats(stats);
        }
      } finally {
        setIsLoader(false);
      }
    })();
  }, [selectedTournament]);

  const oversValue = (row: playerCareerStats) =>
    (row.overs || 0) + (row.ballsBowled || 0) / 6;

  const compareValues = (
    a: playerCareerStats,
    b: playerCareerStats,
    key: SortKey,
  ): number => {
    if (key === "player") {
      const av = (playersMap.get(a.playerId) || a.playerId).toLowerCase();
      const bv = (playersMap.get(b.playerId) || b.playerId).toLowerCase();
      return av.localeCompare(bv);
    }
    if (key === "team") {
      const av = (playerTeamMap.get(a.playerId) || "").toLowerCase();
      const bv = (playerTeamMap.get(b.playerId) || "").toLowerCase();
      return av.localeCompare(bv);
    }
    if (key === "overs") {
      return oversValue(a) - oversValue(b);
    }
    if (key === "fielding") {
      return fieldingTotal(a) - fieldingTotal(b);
    }
    const av = (a as any)[key];
    const bv = (b as any)[key];
    const aNum = typeof av === "number" && !isNaN(av) ? av : -Infinity;
    const bNum = typeof bv === "number" && !isNaN(bv) ? bv : -Infinity;
    return aNum - bNum;
  };

  const sortStats = (
    stats: playerCareerStats[],
    type: "batting" | "bowling",
    sort: SortConfig,
  ): playerCareerStats[] => {
    const isDefaultBatting =
      type === "batting" && sort.key === "runs" && sort.dir === "desc";
    const isDefaultBowling =
      type === "bowling" && sort.key === "wickets" && sort.dir === "desc";

    return [...stats].sort((a, b) => {
      if (isDefaultBatting) {
        if (b.runs !== a.runs) return b.runs - a.runs;
        return (b.strikeRate || 0) - (a.strikeRate || 0);
      }
      if (isDefaultBowling) {
        if (b.wickets !== a.wickets) return b.wickets - a.wickets;
        return (a.bowlingEconomy || Infinity) - (b.bowlingEconomy || Infinity);
      }
      const cmp = compareValues(a, b, sort.key);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  };

  const sortedBatting = useMemo(
    () => sortStats(careerStats, "batting", battingSort),
    [careerStats, battingSort, playersMap, playerTeamMap],
  );
  const sortedBowling = useMemo(
    () => sortStats(careerStats, "bowling", bowlingSort),
    [careerStats, bowlingSort, playersMap, playerTeamMap],
  );

  const handleSort = (
    type: "batting" | "bowling",
    column: { key: SortKey; defaultDir: SortDir },
  ) => {
    const setSort = type === "batting" ? setBattingSort : setBowlingSort;
    const current = type === "batting" ? battingSort : bowlingSort;
    if (current.key === column.key) {
      setSort({ key: column.key, dir: current.dir === "asc" ? "desc" : "asc" });
    } else {
      setSort({ key: column.key, dir: column.defaultDir });
    }
  };

  const webViewRef = useRef<WebView>(null);

  const exportAsImage = (type: "all" | "batting" | "bowling") => {
    setIsLoader(true);

    const generateTableHTML = (
      stats: playerCareerStats[],
      tableType: "batting" | "bowling",
    ) => {
      if (tableType === "batting") {
        return `
          <h2>Batting Records</h2>
          <table>
            <tr>
              <th>Player</th>
              <th>Team</th>
              <th>Runs</th>
              <th>Balls</th>
              <th>Sixes</th>
              <th>Fours</th>
              <th>SR</th>
              <th>Avg</th>
              <th>NO</th>
              <th>Catches</th>
              <th>Innings</th>
              <th>Wins</th>
              <th>Matches</th>
            </tr>
            ${stats
              .slice(0, 50)
              .map(
                (player) => `
              <tr>
                <td>${playersMap.get(player.playerId) || player.playerId}</td>
                <td>${playerTeamMap.get(player.playerId) || "-"}</td>
                <td>${player.runs}</td>
                <td>${player.ballsFaced}</td>
                <td>${player.sixes}</td>
                <td>${player.fours}</td>
                <td>${player.strikeRate ? player.strikeRate.toFixed(2) : "-"}</td>
                <td>${player.average ? player.average.toFixed(2) : "-"}</td>
                <td>${player.notOuts}</td>
                <td>${fieldingTotal(player)}</td>
                <td>${player.innings}</td>
                <td>${isNaN(player.matchesWon) ? "-" : player.matchesWon}</td>
                <td>${player.matches}</td>
              </tr>
            `,
              )
              .join("")}
          </table>
        `;
      } else {
        return `
          <h2>Bowling Records</h2>
          <table>
            <tr>
              <th>Player</th>
              <th>Team</th>
              <th>Overs</th>
              <th>Runs</th>
              <th>Wickets</th>
              <th>Eco</th>
              <th>Extras</th>
              <th>6s</th>
              <th>4s</th>
              <th>Catches</th>
              <th>Wins</th>
              <th>Matches</th>
            </tr>
            ${stats
              .slice(0, 50)
              .map(
                (player) => `
              <tr>
                <td>${playersMap.get(player.playerId) || player.playerId}</td>
                <td>${playerTeamMap.get(player.playerId) || "-"}</td>
                <td>${player.overs}${player.ballsBowled > 0 ? "." + player.ballsBowled : ""}</td>
                <td>${player.runsConceded}</td>
                <td>${player.wickets}</td>
                <td>${player.bowlingEconomy ? player.bowlingEconomy.toFixed(2) : "-"}</td>
                <td>${player.extras}</td>
                <td>${player.sixesConceded}</td>
                <td>${player.foursConceded}</td>
                <td>${fieldingTotal(player)}</td>
                <td>${isNaN(player.matchesWon) ? "-" : player.matchesWon}</td>
                <td>${player.matches}</td>
              </tr>
            `,
              )
              .join("")}
          </table>
        `;
      }
    };

    let tableContent = "";
    let title = "";

    if (type === "batting") {
      tableContent = generateTableHTML(sortedBatting, "batting");
      title = "Batting Stats";
    } else if (type === "bowling") {
      tableContent = generateTableHTML(sortedBowling, "bowling");
      title = "Bowling Stats";
    } else {
      tableContent = `
        ${generateTableHTML(sortedBatting, "batting")}
        ${generateTableHTML(sortedBowling, "bowling")}
      `;
      title = "Player Stats";
    }

    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: ${isDark ? "#1a1a1a" : "#e8ebe8"};
              color: ${isDark ? "#d0d6d0" : "#2d3d2d"};
            }

            .container {
              width: 1200px;
              padding: 20px;
              background-color: ${isDark ? "#242824" : "#ffffff"};
              border: 1px solid ${isDark ? "#2d3d2d" : "#c8d6c8"};
              box-shadow: 0 6px 12px ${isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(45, 61, 45, 0.1)"};
            }

            h1 {
              text-align: center;
              color: ${isDark ? "#8ba88b" : "#3c4f3c"};
              margin: 24px 0;
              padding-bottom: 12px;
              border-bottom: 3px solid ${isDark ? "#5c715c" : "#3c4f3c"};
            }

            h1 .main-title {
              display: block;
              font-size: 36px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 8px;
            }

            h1 .tournament-name {
              display: block;
              font-size: 24px;
              font-weight: 600;
              letter-spacing: 1px;
              color: ${isDark ? "#7a917a" : "#4a5d4a"};
            }

            h2 {
              color: ${isDark ? "#8ba88b" : "#3c4f3c"};
              font-size: 24px;
              font-weight: 600;
              margin: 20px 0;
              padding-left: 12px;
              border-left: 4px solid ${isDark ? "#5c715c" : "#3c4f3c"};
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              border: 1px solid ${isDark ? "#2d3d2d" : "#c8d6c8"};
            }

            th, td {
              border: 1px solid ${isDark ? "#3d4d3d" : "#c8d6c8"};
              padding: 12px;
              text-align: left;
            }

            th {
              background-color: ${isDark ? "#3c4f3c" : "#4a5d4a"};
              color: #d0d6d0;
            }

            tr:nth-child(even) {
              background-color: ${isDark ? "#2a332a" : "#f2f4f2"};
            }

            tr:hover {
              background-color: ${isDark ? "#313931" : "#e0e6e0"};
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>
              <span class="main-title">${title}</span>
              <span class="tournament-name">${selectedTournament ? selectedTournament.name : "All Tournaments"}</span>
            </h1>

            ${tableContent}
          </div>
          <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
          <script>
            const content = document.querySelector('.container');
            const sendImage = () => {
              html2canvas(content, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                logging: false,
                width: content.offsetWidth,
                height: content.offsetHeight
              }).then(canvas => {
                const imageData = canvas.toDataURL('image/png', 1.0);
                window.ReactNativeWebView.postMessage(imageData);
              });
            };
            window.onload = () => {
              setTimeout(sendImage, 500);
            };
          </script>
        </body>
      </html>
    `;

    setWebViewContent(htmlContent);
  };

  const handleMessage = async (event: WebViewMessageEvent) => {
    const base64Data = event.nativeEvent.data.split(",")[1];
    const fileName = `player_career_summary_${Date.now()}.png`;
    let directory =
      (FileSystem as any).cacheDirectory ||
      (FileSystem as any).documentDirectory;

    if (!directory && Platform.OS === "android") {
      directory = "file:///data/user/0/com.vndpal.ScoreCard/cache/";
      try {
        await FileSystem.makeDirectoryAsync(directory, {
          intermediates: true,
        });
      } catch (e) {
        console.warn("Failed to create fallback directory", e);
      }
    }

    if (!directory) {
      console.error("Cache and document directories are null");
      Alert.alert(
        "Error",
        "Unable to save file. File system is not accessible.",
      );
      setIsLoader(false);
      return;
    }
    const filePath = `${directory}${fileName}`;

    try {
      await FileSystem.writeAsStringAsync(filePath, base64Data, {
        encoding: "base64",
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
      } else {
        console.log("Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error saving or sharing image:", error);
    }
    setIsLoader(false);
    setWebViewContent(null);
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return styles.rankGold;
    if (index === 1) return styles.rankSilver;
    if (index === 2) return styles.rankBronze;
    return null;
  };

  const renderSortArrow = (active: boolean, dir: SortDir) => {
    if (!active) return null;
    return (
      <Text style={[styles.sortArrow, themeStyles.sortArrowActive]}>
        {dir === "asc" ? " ▲" : " ▼"}
      </Text>
    );
  };

  const renderFrozenRow = (
    item: playerCareerStats,
    index: number,
    activeSortKey: SortKey,
  ) => (
    <View
      style={[
        styles.frozenRow,
        themeStyles.row,
        index % 2 === 0 && themeStyles.rowEven,
      ]}
      key={`frozen-${item.playerId}`}
    >
      <View style={[styles.rankCell]}>
        <View
          style={[
            styles.rankBadge,
            themeStyles.rankBadge,
            getRankStyle(index),
            index < 3 && styles.rankBadgeTop,
          ]}
        >
          <Text
            style={[
              styles.rankText,
              index < 3 ? styles.rankTextTop : themeStyles.rankTextDefault,
            ]}
          >
            {index + 1}
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.nameCell,
          themeStyles.nameCell,
          activeSortKey === "player" && themeStyles.activeSortCell,
        ]}
      >
        {playersMap.get(item.playerId) || item.playerId}
      </Text>
    </View>
  );

  const renderScrollRow = (
    item: playerCareerStats,
    index: number,
    columns: ColumnDef[],
    activeSortKey: SortKey,
  ) => (
    <View
      style={[
        styles.scrollRow,
        themeStyles.row,
        index % 2 === 0 && themeStyles.rowEven,
      ]}
      key={`scroll-${item.playerId}`}
    >
      <Text
        style={[
          styles.teamCell,
          themeStyles.teamCell,
          activeSortKey === "team" && themeStyles.activeSortCell,
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {playerTeamMap.get(item.playerId) || "-"}
      </Text>
      {columns.map((col) => {
        const raw = (item as any)[col.key];
        const display = col.format ? col.format(raw, item) : raw;
        const isActive = activeSortKey === col.key;
        return (
          <Text
            key={col.key as string}
            style={[
              styles.cell,
              themeStyles.cell,
              col.numeric && styles.numericCell,
              col.highlight && styles.highlightCell,
              col.highlight && themeStyles.highlightCell,
              isActive && themeStyles.activeSortCell,
            ]}
          >
            {display}
          </Text>
        );
      })}
    </View>
  );

  const renderTable = (
    title: string,
    data: playerCareerStats[],
    type: "batting" | "bowling",
    columns: ColumnDef[],
    sort: SortConfig,
    id: string,
  ) => (
    <View key={id} style={[styles.table, themeStyles.table]}>
      <LinearGradient
        colors={isDark ? ["#1e1b4b", "#312e81"] : ["#4F46E5", "#6366F1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tableHeader}
      >
        <Text style={styles.tableTitle}>{title}</Text>
      </LinearGradient>
      <View style={styles.tableBody}>
        {/* Frozen left column: rank + player */}
        <View style={[styles.frozenColumn, themeStyles.identityDivider]}>
          <View
            style={[
              styles.frozenHeader,
              styles.headerRow,
              themeStyles.headerRow,
            ]}
          >
            <Text style={[styles.rankHeaderCell, themeStyles.headerCell]}>
              #
            </Text>
            <TouchableOpacity
              onPress={() =>
                handleSort(type, { key: "player", defaultDir: "asc" })
              }
              style={styles.nameHeaderTouch}
              activeOpacity={0.6}
            >
              <Text style={[styles.headerCellText, themeStyles.headerCell]}>
                Player
                {renderSortArrow(sort.key === "player", sort.dir)}
              </Text>
            </TouchableOpacity>
          </View>
          {data.map((item, index) => renderFrozenRow(item, index, sort.key))}
        </View>

        {/* Scrollable right side: team + stat columns */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollArea}
        >
          <View style={styles.tableContent}>
            <View style={[styles.headerRow, themeStyles.headerRow]}>
              <TouchableOpacity
                onPress={() =>
                  handleSort(type, { key: "team", defaultDir: "asc" })
                }
                style={styles.teamHeaderTouch}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.headerCellText,
                    themeStyles.headerCell,
                    styles.headerCellCenter,
                  ]}
                >
                  Team
                  {renderSortArrow(sort.key === "team", sort.dir)}
                </Text>
              </TouchableOpacity>
              {columns.map((col) => {
                const isActive = sort.key === col.key;
                return (
                  <TouchableOpacity
                    key={col.key as string}
                    onPress={() => handleSort(type, col)}
                    style={[
                      styles.headerCellTouch,
                      isActive && themeStyles.activeSortHeader,
                    ]}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.headerCellText,
                        themeStyles.headerCell,
                        styles.headerCellCenter,
                        isActive && themeStyles.activeSortHeaderText,
                      ]}
                    >
                      {col.label}
                      {renderSortArrow(isActive, sort.dir)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {data.map((item, index) =>
              renderScrollRow(item, index, columns, sort.key),
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        themeStyles.container,
        { paddingBottom: insets.bottom, paddingTop: insets.top },
      ]}
    >
      <View style={[styles.dropdownContainer, themeStyles.dropdownContainer]}>
        <TournamentDropdown
          selectedTournament={selectedTournament}
          onTournamentSelect={setSelectedTournament}
          isAllTournaments={true}
          compact
        />
      </View>
      <ScrollView style={styles.content}>
        {renderTable(
          "Batting Records",
          sortedBatting,
          "batting",
          BATTING_COLUMNS,
          battingSort,
          "1",
        )}
        {renderTable(
          "Bowling Records",
          sortedBowling,
          "bowling",
          BOWLING_COLUMNS,
          bowlingSort,
          "2",
        )}
      </ScrollView>
      <View style={[styles.footer, themeStyles.footer]}>
        <View style={styles.buttonContainer}>
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => exportAsImage("batting")}
              style={styles.battingButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#4F46E5", "#6366F1"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Icon
                  name="cricket"
                  type="material-community"
                  size={18}
                  color="white"
                />
                <Text style={styles.shareButtonText}>Batting</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => exportAsImage("bowling")}
              style={styles.bowlingButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#7C3AED", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Icon
                  name="basketball"
                  type="material-community"
                  size={18}
                  color="white"
                />
                <Text style={styles.shareButtonText}>Bowling</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => exportAsImage("all")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isDark ? ["#4F46E5", "#7C3AED"] : ["#4338CA", "#6D28D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.gradientButton, styles.shareAllButton]}
            >
              <Icon
                name="share-variant"
                type="material-community"
                size={18}
                color="white"
              />
              <Text style={styles.shareButtonText}>Share All Stats</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      {webViewContent && (
        <WebView
          source={{ html: webViewContent }}
          style={{ height: 1, width: 1 }}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          originWhitelist={["*"]}
        />
      )}
      {isLoader && <Loader />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dropdownContainer: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 0,
    borderBottomWidth: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    marginTop: 0,
  },
  footer: {
    padding: 10,
    borderTopWidth: 1,
  },
  table: {
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  tableHeader: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  tableContent: {
    flexDirection: "column",
  },
  tableBody: {
    flexDirection: "row",
  },
  frozenColumn: {
    flexDirection: "column",
  },
  frozenHeader: {
    width: 150,
  },
  scrollArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    alignItems: "stretch",
    minHeight: 56,
  },
  headerCellTouch: {
    flex: 1,
    minWidth: 60,
    justifyContent: "center",
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  nameHeaderTouch: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  teamHeaderTouch: {
    minWidth: 80,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerCellText: {
    fontWeight: "700",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "left",
  },
  headerCellCenter: {
    textAlign: "center",
  },
  headerCell: {
    flex: 1,
    fontWeight: "700",
    textAlign: "center",
    fontSize: 11,
    minWidth: 60,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  rankHeaderCell: {
    width: 40,
    fontWeight: "700",
    textAlign: "center",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlignVertical: "center",
  },
  cell: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    fontSize: 13,
    fontWeight: "500",
    minWidth: 60,
    textAlignVertical: "center",
  },
  numericCell: {
    fontVariant: ["tabular-nums"],
  },
  highlightCell: {
    fontWeight: "800",
  },
  nameCell: {
    flex: 1,
    textAlign: "left",
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 13,
    fontWeight: "600",
    flexWrap: "wrap",
    textAlignVertical: "center",
  },
  teamCell: {
    minWidth: 80,
    textAlign: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    fontSize: 11,
    fontWeight: "500",
    textAlignVertical: "center",
  },
  rankCell: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeTop: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  rankText: {
    fontSize: 12,
    fontWeight: "800",
  },
  rankTextTop: {
    color: "#FFFFFF",
  },
  rankGold: {
    backgroundColor: "#F59E0B",
  },
  rankSilver: {
    backgroundColor: "#9CA3AF",
  },
  rankBronze: {
    backgroundColor: "#D97706",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  frozenRow: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignItems: "center",
    width: 150,
    minHeight: 56,
  },
  scrollRow: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignItems: "center",
    minHeight: 56,
  },
  sortArrow: {
    fontSize: 9,
    fontWeight: "800",
  },
  buttonContainer: {
    gap: 8,
    paddingHorizontal: 4,
  },
  topRow: {
    flexDirection: "row",
    gap: 8,
  },
  battingButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  bowlingButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  shareAllButton: {
    marginTop: 0,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0F0D23",
  },
  dropdownContainer: {
    borderBottomColor: "#2D2B55",
  },
  footer: {
    backgroundColor: "#151331",
    borderTopColor: "#2D2B55",
  },
  table: {
    backgroundColor: "#1A1835",
    borderWidth: 1,
    borderColor: "#2D2B55",
  },
  headerRow: {
    backgroundColor: "#1E1B4B",
    borderBottomColor: "#4F46E5",
  },
  headerCell: {
    color: "#A5B4FC",
  },
  cell: {
    color: "#CBD5E1",
  },
  highlightCell: {
    color: "#F9FAFB",
  },
  nameCell: {
    color: "#A5B4FC",
  },
  teamCell: {
    color: "#94A3B8",
  },
  row: {
    borderBottomColor: "#2D2B55",
    borderBottomWidth: 1,
  },
  rowEven: {
    backgroundColor: "#14122E",
  },
  rankBadge: {
    backgroundColor: "#374151",
  },
  rankTextDefault: {
    color: "#D1D5DB",
  },
  identityDivider: {
    borderRightWidth: 1,
    borderRightColor: "#2D2B55",
  },
  activeSortHeader: {
    backgroundColor: "#312E81",
  },
  activeSortHeaderText: {
    color: "#FFFFFF",
  },
  activeSortCell: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    color: "#FFFFFF",
  },
  sortArrowActive: {
    color: "#FBBF24",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
  },
  dropdownContainer: {
    borderBottomColor: "#E2E8F0",
  },
  footer: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E2E8F0",
  },
  table: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerRow: {
    backgroundColor: "#EEF2FF",
    borderBottomColor: "#4F46E5",
  },
  headerCell: {
    color: "#4338CA",
  },
  cell: {
    color: "#475569",
  },
  highlightCell: {
    color: "#111827",
  },
  nameCell: {
    color: "#4338CA",
  },
  teamCell: {
    color: "#6B7280",
  },
  row: {
    borderBottomColor: "#F1F5F9",
    borderBottomWidth: 1,
  },
  rowEven: {
    backgroundColor: "#F5F7FF",
  },
  rankBadge: {
    backgroundColor: "#E5E7EB",
  },
  rankTextDefault: {
    color: "#6B7280",
  },
  identityDivider: {
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  activeSortHeader: {
    backgroundColor: "#C7D2FE",
  },
  activeSortHeaderText: {
    color: "#3730A3",
  },
  activeSortCell: {
    backgroundColor: "#EEF2FF",
    color: "#1E1B4B",
  },
  sortArrowActive: {
    color: "#4338CA",
  },
});

export default PlayerCareerSummary;
