import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Menu } from "react-native-paper";
import { Icon } from "react-native-elements";
import { getItem, setItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { player } from "@/types/player";
import { team } from "@/types/team";
import TeamSelection from "./TeamSelection";
import teams from "@/interfaces/teams";
import { teamPlayerMapping } from "@/types/teamPlayerMapping";
import { router } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { match } from "@/types/match";
import { playerMatchStats } from "@/types/playerMatchStats";
import { playerStats } from "@/types/playerStats";

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

  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  useEffect(() => {
    (async () => {
      const teamPlayersMapping = await getItem(
        STORAGE_ITEMS.TEAM_PLAYER_MAPPING
      );
      const playersFromStorage: player[] = await getItem(STORAGE_ITEMS.PLAYERS);
      if (playersFromStorage && playersFromStorage.length > 0) {
        playersFromStorage.sort((a, b) => a.name.localeCompare(b.name));
        setAllPlayers(playersFromStorage);
      }
      const teams: team[] = await getItem(STORAGE_ITEMS.TEAMS);

      const matches: match[] = await getItem(STORAGE_ITEMS.MATCHES);
      if (matches && matches.length > 0 && matches[0].status === "live") {
        const playerMatchStats: playerMatchStats[] = await getItem(
          STORAGE_ITEMS.PLAYER_MATCH_STATS
        );
        if (playerMatchStats && playerMatchStats.length > 0) {
          const playerStats = playerMatchStats.filter(
            (x) => x.matchId === matches[0].matchId
          );

          if (playerStats && playerStats.length > 0) {
            const currentMatchPlayerStats = playerStats[0].playerMatchStats;
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
            console.log("playerdPlayers", playedPlayers);
            setActivePlayerIds(playedPlayers);
            setCurrentMatchId(matches[0].matchId);
          }
        }
      }

      const savedTeams = Object.keys(teamPlayersMapping || {});
      if (
        savedTeams.length >= 2 &&
        teams &&
        teams.length > 1 &&
        playersFromStorage &&
        playersFromStorage.length > 0
      ) {
        const localTeam1 = teams.find(
          (team) => team.teamInitials === savedTeams[0]
        );
        const localTeam2 = teams.find(
          (team) => team.teamInitials === savedTeams[1]
        );
        setTeam1(localTeam1);
        setTeam2(localTeam2);

        setTeam1Players(
          playersFromStorage.filter((player) =>
            teamPlayersMapping[savedTeams[0]].includes(player.id)
          )
        );
        setTeam2Players(
          playersFromStorage.filter((player) =>
            teamPlayersMapping[savedTeams[1]].includes(player.id)
          )
        );
        setAvailablePlayers(
          playersFromStorage.filter(
            (player) =>
              !teamPlayersMapping[savedTeams[0]].includes(player.id) &&
              !teamPlayersMapping[savedTeams[1]].includes(player.id)
          )
        );
      } else if (playersFromStorage && playersFromStorage.length > 0) {
        setAvailablePlayers(playersFromStorage);
      }
    })();
  }, []);

  const handleAddPlayer = (selectedPlayer: player) => {
    if (selectedPlayer) {
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

      setTeam1DropdownOpen(false);
      setTeam2DropdownOpen(false);
    }
  };

  const openMenu = (team: "team1" | "team2") => {
    if (team === "team1") {
      setTeam1DropdownOpen(true);
    } else {
      setTeam2DropdownOpen(true);
    }
  };

  const closeMenu = () => {
    setTeam1DropdownOpen(false);
    setTeam2DropdownOpen(false);
  };

  const removePlayer = (playerId: string, team: "team1" | "team2") => {
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

  const renderPlayer = ({
    item,
    team,
  }: {
    item: player;
    team: "team1" | "team2";
  }) => (
    <View style={[styles.playerCard, themeStyles.playerCard]}>
      <Text style={[styles.playerName, themeStyles.playerName]}>
        {item.name}
      </Text>
      {!activePlayerIds.includes(item.id) && (
        <TouchableOpacity onPress={() => removePlayer(item.id, team)}>
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
  );

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

    const updatedTeamPlayerMapping: teamPlayerMapping = {
      [team1!.teamInitials]: team1Players.map((player: player) => player.id),
      [team2!.teamInitials]: team2Players.map((player: player) => player.id),
    };

    await setItem(STORAGE_ITEMS.TEAM_PLAYER_MAPPING, updatedTeamPlayerMapping);

    if (currentMatchId !== "") {
      const updatedLiveMatchPlayerStats: playerStats[] =
        currentMatchPlayerStats;
      for (const teamInitials in updatedTeamPlayerMapping) {
        for (const playerId of updatedTeamPlayerMapping[teamInitials]) {
          if (!activePlayerIds.includes(playerId)) {
            const existingPlayerStats = updatedLiveMatchPlayerStats.find(
              (stats) => stats.playerId === playerId
            );
            if (!existingPlayerStats) {
              updatedLiveMatchPlayerStats.push({
                playerId: playerId,
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
                team: teamInitials,
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
                (x) => x.playerId === playerId
              );
              if (playerStats) {
                playerStats.team = teamInitials;
              }
            }
          }
        }
      }

      const databasePlayerMatchStats: playerMatchStats[] = await getItem(
        STORAGE_ITEMS.PLAYER_MATCH_STATS
      );

      if (databasePlayerMatchStats && databasePlayerMatchStats.length > 0) {
        databasePlayerMatchStats[0].playerMatchStats =
          updatedLiveMatchPlayerStats;
        await setItem(
          STORAGE_ITEMS.PLAYER_MATCH_STATS,
          databasePlayerMatchStats
        );
      }
    }

    if (currentMatchId !== "") {
      router.push("/");
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, themeStyles.container]}>
      <View style={styles.playersContainer}>
        <View style={[styles.teamContainer, themeStyles.teamContainer]}>
          <View style={styles.headerContainer}>
            <Text style={[styles.header, themeStyles.header]}>
              {team1?.teamInitials ? team1.teamInitials : "Team 1"}{" "}
              <Text style={[styles.playerCount, themeStyles.playerCount]}>
                {"(" + team1Players.length + ")"}
              </Text>
            </Text>
            <Menu
              visible={team1DropdownOpen}
              onDismiss={closeMenu}
              anchor={
                <TouchableOpacity
                  onPress={() => openMenu("team1")}
                  style={styles.menuButton}
                >
                  <Icon
                    name="add-circle"
                    type="Ionicons"
                    color={"#4CAF50"}
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
          <FlatList
            data={team1Players}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => renderPlayer({ item, team: "team1" })}
          />
        </View>

        <View style={[styles.teamContainer, themeStyles.teamContainer]}>
          <View style={styles.headerContainer}>
            <Text style={[styles.header, themeStyles.header]}>
              {team2?.teamInitials ? team2.teamInitials : "Team 2"}{" "}
              <Text style={[styles.playerCount, themeStyles.playerCount]}>
                {"(" + team2Players.length + ")"}
              </Text>
            </Text>
            <Menu
              visible={team2DropdownOpen}
              onDismiss={closeMenu}
              anchor={
                <TouchableOpacity
                  onPress={() => openMenu("team2")}
                  style={styles.menuButton}
                >
                  <Icon
                    name="add-circle"
                    type="Ionicons"
                    color={"#4CAF50"}
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
          <FlatList
            data={team2Players}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => renderPlayer({ item, team: "team2" })}
          />
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.configButton, themeStyles.configButton]}
          onPress={() => setTeamSelectionVisible(true)}
          disabled={currentMatchId !== ""}
        >
          <Icon name="swap" type="entypo" color="white" size={20} />
          <Text style={[styles.buttonText, themeStyles.buttonText]}>
            Change Team
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.configButton, themeStyles.configButton]}
          disabled={currentMatchId !== ""}
          onPress={randomizeTeams}
        >
          <Icon name="random" type="font-awesome" color="white" size={20} />
          <Text style={[styles.buttonText, themeStyles.buttonText]}>
            Randomize
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, themeStyles.saveButton]}
        onPress={saveTeams}
      >
        <Text style={[styles.buttonText, themeStyles.buttonText]}>Save</Text>
      </TouchableOpacity>

      <TeamSelection
        visible={teamSelectionVisible}
        onDismiss={() => setTeamSelectionVisible(false)}
        onSubmit={teamSelectionSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#1F1F1F", // Dark background for a modern look
  },
  playersContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  teamContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#333", // Slightly lighter border for better contrast
    borderRadius: 8,
    backgroundColor: "#2C2C2C",
    marginHorizontal: 8, // Increased margin for better separation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, // Increased shadow for a more pronounced effect
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    padding: 12, // Reduced padding to make the layout more compact
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20, // Increased margin for better spacing
    height: 22, // Slightly taller for better alignment
  },
  header: {
    color: "#FFFFFF",
    flexWrap: "wrap",
    maxHeight: 22, // Ensure the header fits within its container
    lineHeight: 22,
    fontSize: 16, // Slightly reduced font size for compactness
    fontWeight: "700", // Bold for emphasis
  },
  playerCount: {
    color: "#DDDDDD",
    fontSize: 12, // Smaller size to save space
  },
  playerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6, // Increased margin for better spacing
    backgroundColor: "#333",
    flexWrap: "wrap",
    borderRadius: 4, // Less rounded corners for a modern aesthetic
    padding: 10, // Reduced padding for a more compact appearance
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 14, // Slightly smaller font size for compactness
    fontWeight: "600", // Semi-bold to retain readability and elegance
  },
  removeIcon: {
    marginLeft: 12, // Increased margin for better spacing
  },
  menuButton: {
    padding: 0,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  configButton: {
    flexDirection: "row",
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: 8, // Increased margin for better spacing
    paddingVertical: 8, // Reduced padding for a more compact button
    paddingHorizontal: 16,
    borderRadius: 20, // Less rounded for a modern appearance
  },
  saveButton: {
    backgroundColor: "#0c66e4",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8, // Maintain margin for consistency
    paddingVertical: 8, // Reduced padding for a more compact button
    paddingHorizontal: 16,
    borderRadius: 20, // Less rounded for consistency
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16, // Larger font size for better readability
    marginLeft: 8,
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#121212",
  },
  teamContainer: {
    backgroundColor: "#2C2C2C",
    borderColor: "#333",
  },
  playerCard: {
    backgroundColor: "#333",
  },
  playerName: {
    color: "#FFFFFF",
  },
  removeIcon: {
    color: "#FF6F6F",
  },
  header: {
    color: "#FFFFFF",
  },
  playerCount: {
    color: "#DDDDDD",
  },
  configButton: {
    backgroundColor: "#4CAF50",
  },
  saveButton: {
    backgroundColor: "#0c66e4",
  },
  buttonText: {
    fontSize: 14, // Slightly smaller font size for compactness
    fontWeight: "600", // Semi-bold for emphasis without overwhelming
    color: "#FFFFFF",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FAFAFA", // Softer background color for a more modern look
  },
  teamContainer: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E0E0E0", // Lighter border for a clean and minimal look
  },
  playerCard: {
    backgroundColor: "#F9F9F9", // Slightly off-white for a subtle distinction
  },
  playerName: {
    color: "#333333", // Dark gray for a softer, classy text color
  },
  removeIcon: {
    color: "#E57373", // Softer red for a more refined look
  },
  header: {
    color: "#333333", // Darker text for better contrast and readability
  },
  playerCount: {
    color: "#888888", // Softer gray for a subtle, modern look
  },
  configButton: {
    backgroundColor: "#388E3C", // Slightly darker green for a more sophisticated look
  },
  saveButton: {
    backgroundColor: "#1565C0", // Slightly darker blue for a more professional tone
  },
  buttonText: {
    color: "#FFFFFF",
  },
});

export default TeamLineUp;
