import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Alert,
  Dimensions,
} from "react-native";
import { Menu, useTheme } from "react-native-paper";
import { Icon } from "react-native-elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { player } from "@/types/player";
import { team } from "@/types/team";
import TeamSelection from "./TeamSelection";
import teams from "@/interfaces/teams";
import { teamPlayerMapping } from "@/types/teamPlayerMapping";
import { router } from "expo-router";
import { useAppContext } from "@/context/AppContext";
import { match } from "@/types/match";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";
import { Player } from "@/firebase/models/Player";
import { Team } from "@/firebase/models/Team";
import { TeamPlayerMapping } from "@/firebase/models/TeamPlayerMapping";
import { getItem, setItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { Match } from "@/firebase/models/Match";
import Loader from "./Loader";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const TeamLineUp: React.FC = () => {
  const [team1Players, setTeam1Players] = useState<player[]>([]);
  const [team2Players, setTeam2Players] = useState<player[]>([]);
  const [team1, setTeam1] = useState<team>();
  const [team2, setTeam2] = useState<team>();
  const [availablePlayers, setAvailablePlayers] = useState<player[]>([]);
  const [allPlayers, setAllPlayers] = useState<player[]>([]);
  const [team1DropdownOpen, setTeam1DropdownOpen] = useState<boolean>(false);
  const [team2DropdownOpen, setTeam2DropdownOpen] = useState<boolean>(false);
  const [teamSelectionVisible, setTeamSelectionVisible] =
    useState<boolean>(false);
  const [activePlayerIds, setActivePlayerIds] = useState<string[]>([]);
  const [currentMatchId, setCurrentMatchId] = useState<string>("");
  const [currentMatchPlayerStats, setCurrentMatchPlayerStats] = useState<
    playerStats[]
  >([]);
  const [loader, setLoader] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const { currentTheme, club } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      setLoader(true);
      const teamPlayersMapping = await TeamPlayerMapping.getAllFromClub(
        club.id
      );
      const playersFromStorage: player[] = await Player.getAllFromClub(club.id);

      if (playersFromStorage && playersFromStorage.length > 0) {
        playersFromStorage.sort((a, b) => a.name.localeCompare(b.name));
        setAllPlayers(playersFromStorage);
      }
      const teams: team[] = await Team.getAllByClubId(club.id);
      let lastMatchTeam1: string;
      let lastMatchTeam2: string;
      const lastMatch = await Match.getLatestMatch(club.id);
      if (lastMatch) {
        lastMatchTeam1 = lastMatch.team1;
        lastMatchTeam2 = lastMatch.team2;
      } else if (teamPlayersMapping && teamPlayersMapping.length >= 2) {
        lastMatchTeam1 = teamPlayersMapping[0].team;
        lastMatchTeam2 = teamPlayersMapping[1].team;
      }
      if (lastMatch && lastMatch.status === "live") {
        const playerStats = await PlayerMatchStats.getByMatchId(
          lastMatch.matchId
        );

        if (playerStats) {
          const currentMatchPlayerStats = playerStats.playerMatchStats;
          setCurrentMatchPlayerStats(currentMatchPlayerStats);
          const playedPlayers = currentMatchPlayerStats
            .filter(
              (x) =>
                x.ballsBowled > 0 ||
                x.overs > 0 ||
                x.extras > 0 ||
                x.runs > 0 ||
                x.ballsFaced > 0 ||
                x.isOut == true
            )
            .map((x) => x.playerId);
          setActivePlayerIds(playedPlayers);
          setCurrentMatchId(lastMatch.matchId);
        }
      }

      if (
        teamPlayersMapping.length >= 2 &&
        teams &&
        teams.length > 1 &&
        playersFromStorage &&
        playersFromStorage.length > 0
      ) {
        const localTeam1 = teams.find(
          (team) => team.teamInitials === lastMatchTeam1
        );
        const localTeam2 = teams.find(
          (team) => team.teamInitials === lastMatchTeam2
        );
        setTeam1(localTeam1);
        setTeam2(localTeam2);

        setTeam1Players(
          playersFromStorage.filter((player) =>
            teamPlayersMapping
              .find((mapping) => mapping.team === localTeam1?.teamInitials)
              ?.players.map((p) => p.id)
              .includes(player.id)
          )
        );
        setTeam2Players(
          playersFromStorage.filter((player) =>
            teamPlayersMapping
              .find((mapping) => mapping.team === localTeam2?.teamInitials)
              ?.players.map((p) => p.id)
              .includes(player.id)
          )
        );
        setAvailablePlayers(
          playersFromStorage.filter(
            (player) =>
              !teamPlayersMapping
                .find((mapping) => mapping.team === localTeam1?.teamInitials)
                ?.players.map((p) => p.id)
                .includes(player.id) &&
              !teamPlayersMapping
                .find((mapping) => mapping.team === localTeam2?.teamInitials)
                ?.players.map((p) => p.id)
                .includes(player.id)
          )
        );
      } else if (playersFromStorage && playersFromStorage.length > 0) {
        setAvailablePlayers(playersFromStorage);
      }
      setLoader(false);
    })();
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (hasUnsavedChanges) {
          Alert.alert(
            "Unsaved Changes",
            "You have unsaved changes. Do you want to save before leaving?",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => null,
              },
              {
                text: "Discard",
                style: "destructive",
                onPress: () => router.back(),
              },
              {
                text: "Save",
                onPress: saveTeams,
              },
            ]
          );
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [hasUnsavedChanges]);

  const lastMenuCloseTime = useRef<number>(0);



  const handleAddPlayer = (selectedPlayer: player) => {
    if (selectedPlayer) {
      setHasUnsavedChanges(true);
      if (team1DropdownOpen) {
        setTeam1Players([...team1Players, selectedPlayer]);
        setAvailablePlayers(
          availablePlayers.filter((player) => player.id !== selectedPlayer.id)
        );
      } else if (team2DropdownOpen) {
        setTeam2Players([...team2Players, selectedPlayer]);
        setAvailablePlayers(
          availablePlayers.filter((player) => player.id !== selectedPlayer.id)
        );
      }

      closeMenu();
    }
  };

  const openMenu = (team: "team1" | "team2") => {
    // Prevent opening if the menu was just closed (debounce)
    if (Date.now() - lastMenuCloseTime.current < 300) {
      return;
    }

    if (!team1 || !team2) {
      setTeamSelectionVisible(true);
      return;
    }
    if (team === "team1") {
      setTeam1DropdownOpen(true);
    } else {
      setTeam2DropdownOpen(true);
    }
  };

  const closeMenu = () => {
    lastMenuCloseTime.current = Date.now();
    setTeam1DropdownOpen(false);
    setTeam2DropdownOpen(false);
  };

  const removePlayer = (playerId: string, team: "team1" | "team2") => {
    setHasUnsavedChanges(true);
    if (team === "team1") {
      setTeam1Players(team1Players.filter((player) => player.id !== playerId));
    } else {
      setTeam2Players(team2Players.filter((player) => player.id !== playerId));
    }
    setAvailablePlayers([
      ...availablePlayers,
      allPlayers.find((player) => player.id === playerId)!,
    ]);
  };

  const randomizeTeams = () => {
    const shuffledPlayers = [...allPlayers].sort(() => 0.5 - Math.random());
    const team1Players = shuffledPlayers.slice(
      0,
      Math.ceil(shuffledPlayers.length / 2)
    );
    const team2Players = shuffledPlayers.slice(
      Math.ceil(shuffledPlayers.length / 2)
    );

    setTeam1Players(team1Players);
    setTeam2Players(team2Players);
    setAvailablePlayers([]);
  };

  const teamSelectionSubmit = (values: teams) => {
    setTeam1(values.team1);
    setTeam2(values.team2);
    setTeam1Players([]);
    setTeam2Players([]);
    setAvailablePlayers(allPlayers);
  };

  const saveTeams = async () => {
    if (!team1 || !team2) {
      return;
    }

    if (Math.abs(team1Players.length - team2Players.length) > 1) {
      alert("Teams should have equal or one player difference");
      return;
    }

    if (team1Players.length === 0 || team2Players.length === 0) {
      alert("Add players to the teams before saving");
      return;
    }

    await TeamPlayerMapping.createOrUpdate(
      team1!.teamInitials,
      club.id,
      team1Players
    );
    await TeamPlayerMapping.createOrUpdate(
      team2!.teamInitials,
      club.id,
      team2Players
    );

    if (currentMatchId !== "") {
      let updatedLiveMatchPlayerStats: playerStats[] = currentMatchPlayerStats;
      for (const player of team1Players) {
        if (!activePlayerIds.includes(player.id)) {
          const existingPlayerStats = updatedLiveMatchPlayerStats.find(
            (stats) => stats.playerId === player.id
          );
          if (!existingPlayerStats) {
            updatedLiveMatchPlayerStats.push({
              playerId: player.id,
              name: player.name,
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
              team: team1!.teamInitials,
              strikeRate: 0,
              average: 0,
              foursConceded: 0,
              sixesConceded: 0,
              maidens: 0,
              bowlingEconomy: 0,
              dotBalls: 0,
            });
          } else {
            const playerStats = updatedLiveMatchPlayerStats.find(
              (x) => x.playerId === player.id
            );
            if (playerStats) {
              playerStats.team = team1!.teamInitials;
            }
          }
        }
      }

      for (const player of team2Players) {
        if (!activePlayerIds.includes(player.id)) {
          const existingPlayerStats = updatedLiveMatchPlayerStats.find(
            (stats) => stats.playerId === player.id
          );
          if (!existingPlayerStats) {
            updatedLiveMatchPlayerStats.push({
              playerId: player.id,
              name: player.name,
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
              team: team2!.teamInitials,
              strikeRate: 0,
              average: 0,
              foursConceded: 0,
              sixesConceded: 0,
              maidens: 0,
              bowlingEconomy: 0,
              dotBalls: 0,
            });
          } else {
            const playerStats = updatedLiveMatchPlayerStats.find(
              (x) => x.playerId === player.id
            );
            if (playerStats) {
              playerStats.team = team2!.teamInitials;
            }
          }
        }
      }

      const playersFromBothTeams: player[] = [...team1Players, ...team2Players];
      const playerIdsFromBothTeams: string[] = playersFromBothTeams.map(
        (x) => x.id
      );

      updatedLiveMatchPlayerStats = updatedLiveMatchPlayerStats.filter((x) =>
        playerIdsFromBothTeams.includes(x.playerId)
      );

      await PlayerMatchStats.update(currentMatchId, {
        matchId: currentMatchId,
        playerMatchStats: updatedLiveMatchPlayerStats,
      });
    }

    if (currentMatchId !== "") {
      router.push("/");
    } else {
      router.back();
    }
    setHasUnsavedChanges(false);
  };

  return (
    <View style={[styles.container, themeStyles.container]}>
      <LinearGradient
        colors={
          currentTheme === "dark"
            ? ["#1a1a1a", "#2a2a2a"]
            : ["#FFFFFF", "#F5F5F5"]
        }
        style={styles.gradientBackground}
      >
        <View
          style={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 12), paddingTop: insets.top },
          ]}
        >
          <View style={styles.teamsGrid}>
            {/* Team 1 Section */}
            <View style={[styles.teamSection, themeStyles.teamSection]}>
              <View style={styles.teamHeader}>
                <View style={styles.teamTitleContainer}>
                  <Text style={[styles.teamTitle, themeStyles.teamTitle]}>
                    {team1?.teamInitials || "Team 1"}
                  </Text>
                  <Text style={[styles.playerCount, themeStyles.playerCount]}>
                    {team1Players.length} Players
                  </Text>
                </View>
                <Menu
                  key={`team1-menu-${availablePlayers.length}`}
                  visible={team1DropdownOpen}
                  onDismiss={closeMenu}
                  anchor={
                    <TouchableOpacity
                      onPress={() => openMenu("team1")}
                      style={styles.addButton}
                    >
                      <Icon
                        name="add"
                        type="material"
                        color="#4CAF50"
                        size={24}
                      />
                    </TouchableOpacity>
                  }
                >
                  {availablePlayers.map((player) => (
                    <Menu.Item
                      key={player.id}
                      onPress={() => handleAddPlayer(player)}
                      title={player.name}
                    />
                  ))}
                </Menu>
              </View>
              <View style={styles.playersList}>
                <FlatList
                  data={team1Players}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={[styles.playerItem, themeStyles.playerItem]}>
                      <Text style={[styles.playerName, themeStyles.playerName]}>
                        {item.name}
                      </Text>
                      {!activePlayerIds.includes(item.id) && (
                        <TouchableOpacity
                          onPress={() => removePlayer(item.id, "team1")}
                          style={styles.removeButton}
                        >
                          <Icon
                            name="remove-circle"
                            type="Ionicons"
                            size={22}
                            color="#FF6F6F"
                            style={styles.removeIcon}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                />
              </View>
            </View>

            {/* Team 2 Section */}
            <View style={[styles.teamSection, themeStyles.teamSection]}>
              <View style={styles.teamHeader}>
                <View style={styles.teamTitleContainer}>
                  <Text style={[styles.teamTitle, themeStyles.teamTitle]}>
                    {team2?.teamInitials || "Team 2"}
                  </Text>
                  <Text style={[styles.playerCount, themeStyles.playerCount]}>
                    {team2Players.length} Players
                  </Text>
                </View>
                <Menu
                  key={`team2-menu-${availablePlayers.length}`}
                  visible={team2DropdownOpen}
                  onDismiss={closeMenu}
                  anchor={
                    <TouchableOpacity
                      onPress={() => openMenu("team2")}
                      style={styles.addButton}
                    >
                      <Icon
                        name="add"
                        type="material"
                        color="#4CAF50"
                        size={24}
                      />
                    </TouchableOpacity>
                  }
                >
                  {availablePlayers.map((player) => (
                    <Menu.Item
                      key={player.id}
                      onPress={() => handleAddPlayer(player)}
                      title={player.name}
                    />
                  ))}
                </Menu>
              </View>
              <View style={styles.playersList}>
                <FlatList
                  data={team2Players}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={[styles.playerItem, themeStyles.playerItem]}>
                      <Text style={[styles.playerName, themeStyles.playerName]}>
                        {item.name}
                      </Text>
                      {!activePlayerIds.includes(item.id) && (
                        <TouchableOpacity
                          onPress={() => removePlayer(item.id, "team2")}
                          style={styles.removeButton}
                        >
                          <Icon
                            name="remove-circle"
                            type="Ionicons"
                            size={22}
                            color="#FF6F6F"
                            style={styles.removeIcon}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                />
              </View>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                themeStyles.actionButton,
                currentMatchId !== "" && styles.actionButtonDisabled,
              ]}
              onPress={() => setTeamSelectionVisible(true)}
              disabled={currentMatchId !== ""}
            >
              <Icon name="group" type="material" color="white" size={20} />
              <Text
                style={[styles.actionButtonText, themeStyles.actionButtonText]}
              >
                New Selection
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                themeStyles.actionButton,
                currentMatchId !== "" && styles.actionButtonDisabled,
              ]}
              disabled={currentMatchId !== ""}
              onPress={randomizeTeams}
            >
              <Icon name="shuffle" type="material" color="white" size={20} />
              <Text
                style={[styles.actionButtonText, themeStyles.actionButtonText]}
              >
                Randomize
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, themeStyles.saveButton]}
            onPress={saveTeams}
          >
            <Text style={[styles.saveButtonText, themeStyles.saveButtonText]}>
              Save Teams
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <TeamSelection
        visible={teamSelectionVisible}
        onDismiss={() => setTeamSelectionVisible(false)}
        onSubmit={teamSelectionSubmit}
      />
      {loader && <Loader />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 12,
  },
  teamsGrid: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  teamSection: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  teamTitleContainer: {
    flex: 1,
  },
  teamTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  playerCount: {
    fontSize: 13,
    opacity: 0.7,
  },
  addButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  playersList: {
    flex: 1,
  },
  playerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    marginVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  playerName: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    // padding: 4,
    // minWidth: 24,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  removeIcon: {
    marginLeft: 6, // Increased margin for better spacing
  },
  actionButtonDisabled: {
    backgroundColor: "#D3D3D3",
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#1a1a1a",
  },
  teamSection: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  teamTitle: {
    color: "#FFFFFF",
  },
  playerCount: {
    color: "#AAAAAA",
  },
  playerItem: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  playerName: {
    color: "#FFFFFF",
  },
  actionButton: {
    backgroundColor: "#4CAF50",
  },
  actionButtonText: {
    color: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: "#0c66e4",
  },
  saveButtonText: {
    color: "#FFFFFF",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
  },
  teamSection: {
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  teamTitle: {
    color: "#333333",
  },
  playerCount: {
    color: "#666666",
  },
  playerItem: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  playerName: {
    color: "#333333",
  },
  actionButton: {
    backgroundColor: "#388E3C",
  },
  actionButtonText: {
    color: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: "#1565C0",
  },
  saveButtonText: {
    color: "#FFFFFF",
  },
});

export default TeamLineUp;
