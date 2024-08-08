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
      } else {
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
    <View style={styles.playerCard}>
      <Text style={styles.playerName}>{item.name}</Text>
      <TouchableOpacity onPress={() => removePlayer(item.id, team)}>
        <Icon
          name="remove-circle"
          type="Ionicons"
          size={22}
          color="#FF6F6F"
          style={styles.removeIcon}
        />
      </TouchableOpacity>
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
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.playersContainer}>
        <View style={styles.teamContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.header}>
              {team1?.teamInitials ? team1.teamInitials : "Team 1"}{" "}
              <Text style={styles.playerCount}>
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

        <View style={styles.teamContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.header}>
              {team2?.teamInitials ? team2.teamInitials : "Team 2"}{" "}
              <Text style={styles.playerCount}>
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
          style={styles.configButton}
          onPress={() => setTeamSelectionVisible(true)}
        >
          <Icon name="swap" type="entypo" color="white" size={20} />
          <Text style={styles.buttonText}>Change Team</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.configButton} onPress={randomizeTeams}>
          <Icon name="random" type="font-awesome" color="white" size={20} />
          <Text style={styles.buttonText}>Randomize</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveTeams}>
        <Text style={styles.buttonText}>Preview and Save</Text>
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
    padding: 16, // Increased padding for more spacious content
    backgroundColor: "#2C2C2C",
    marginHorizontal: 8, // Increased margin for better separation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, // Increased shadow for a more pronounced effect
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20, // Increased margin for better spacing
    height: 22, // Slightly taller for better alignment
  },
  header: {
    fontSize: 18, // Larger font size for better readability
    fontWeight: "700", // Bolder text for emphasis
    color: "#FFFFFF",
    flexWrap: "wrap",
    maxHeight: 22, // Ensure the header fits within its container
    lineHeight: 22,
  },
  playerCount: {
    fontSize: 14, // Increased font size for better visibility
    color: "#DDDDDD",
  },
  playerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12, // Increased padding for a more spacious layout
    marginVertical: 6, // Increased margin for better spacing
    backgroundColor: "#333",
    borderRadius: 6, // Slightly rounded corners
    flexWrap: "wrap",
  },
  playerName: {
    fontSize: 16, // Larger font size for better readability
    color: "#FFFFFF",
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
    paddingVertical: 10, // Increased padding for a more prominent button
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: 8, // Increased margin for better spacing
  },
  saveButton: {
    backgroundColor: "#0c66e4",
    paddingVertical: 10, // Increased padding for a more prominent button
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8, // Maintain margin for consistency
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16, // Larger font size for better readability
    marginLeft: 8,
  },
});

export default TeamLineUp;
