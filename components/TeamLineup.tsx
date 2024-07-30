import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { Icon } from "react-native-elements";
import TeamSelection from "./TeamSelection";
import teams from "@/interfaces/teams";
import { player } from "@/types/player";
import { getItem, setItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { teamPlayerMapping } from "@/types/teamPlayerMapping";
import { team } from "@/types/team";
import PreviewTeam from "./PreviewTeam";

// Define the Player type
type Player = {
  id: string;
  name: string;
  team: "none" | "team1" | "team2";
};

// Define the TeamLineup component
const TeamLineup: React.FC = () => {
  // Initialize the state with a list of players
  const [players, setPlayers] = useState<Player[]>([]);

  const [teamSelectionVisible, setTeamSelectionVisible] =
    useState<boolean>(false);

  const [previewTeamVisible, setPreviewTeamVisible] = useState<boolean>(false);

  const [team1, setTeam1] = useState<team>();
  const [team2, setTeam2] = useState<team>();

  useEffect(() => {
    (async () => {
      // Get the team player mapping from storage
      const teamPlayersMapping = await getItem(
        STORAGE_ITEMS.TEAM_PLAYER_MAPPING
      );

      // Get the players, teams from storage
      const playersFromStorage: player[] = await getItem(STORAGE_ITEMS.PLAYERS);
      // Get the teams from storage
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

        const team1Players =
          teamPlayersMapping[localTeam1?.teamInitials || ""] || [];
        const team2Players =
          teamPlayersMapping[localTeam2?.teamInitials || ""] || [];
        const players = playersFromStorage.map((player) => ({
          id: player.id.toString(),
          name: player.name,
          team: team1Players.includes(player.id.toString())
            ? "team1"
            : team2Players.includes(player.id.toString())
            ? "team2"
            : "none",
        }));

        setPlayers(
          players.map((player) => ({
            id: player.id,
            name: player.name,
            team: player.team as "none" | "team1" | "team2",
          }))
        );
      } else {
        setPlayers(
          playersFromStorage.map((player) => ({
            id: player.id.toString(),
            name: player.name,
            team: "none",
          }))
        );
      }
    })();
  }, []);

  // Handle assigning a player to a team or making them available
  const assignToTeam = (playerId: string, team: "team1" | "team2") => {
    setPlayers(
      players.map((player) =>
        player.id === playerId
          ? { ...player, team: player.team === team ? "none" : team }
          : player
      )
    );

    const res = players.map((player) =>
      player.id === playerId
        ? { ...player, team: player.team === team ? "none" : team }
        : player
    );
  };

  // Handle saving the team assignments
  const saveTeams = async () => {
    const allPlayersHaveNoneTeam = players.every(
      (player) => player.team === "none"
    );
    if (allPlayersHaveNoneTeam) {
      Alert.alert("Warning!", "Please assign players to teams before saving!");
      return;
    }

    const team1PlayerCount = players.filter(
      (player) => player.team === "team1"
    ).length;
    const team2PlayerCount = players.filter(
      (player) => player.team === "team2"
    ).length;

    if (Math.abs(team1PlayerCount - team2PlayerCount) > 1) {
      Alert.alert(
        "Player Count Mismatch",
        `Teams must have equal players or differ by at most 1 player!\n\n${team1?.teamName}: ${team1PlayerCount}\n${team2?.teamName}: ${team2PlayerCount}`
      );
      return;
    }

    if (!team1 || !team2 || !team1!.teamInitials || !team2!.teamInitials) {
      setTeamSelectionVisible(true);
      return;
    }

    setPreviewTeamVisible(true);
  };

  const handleSaveAfterReview = async () => {
    console.log("Saving teams");
    const playersInTeam1 = players
      .filter((player) => player.team === "team1")
      .map((player) => player.id);
    const playersInTeam2 = players
      .filter((player) => player.team === "team2")
      .map((player) => player.id);

    const teamPlayerMapping = await getItem(STORAGE_ITEMS.TEAM_PLAYER_MAPPING);
    const updatedTeamPlayerMapping: teamPlayerMapping = {
      [team1!.teamInitials]: playersInTeam1,
      [team2!.teamInitials]: playersInTeam2,
    };

    await setItem(STORAGE_ITEMS.TEAM_PLAYER_MAPPING, updatedTeamPlayerMapping);
  };

  const randomizeTeams = () => {
    let team1Count = 0;
    let team2Count = 0;
    setPlayers(
      players
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
        .map((player, index) => {
          if (team1Count <= team2Count) {
            team1Count++;
            return { ...player, team: "team1" };
          } else {
            team2Count++;
            return { ...player, team: "team2" };
          }
        })
    );
  };

  // Sort players based on their team assignment
  const sortedPlayers = players.slice().sort((a, b) => {
    if (a.team === "none") return -1;
    if (b.team === "none") return 1;
    if (a.team === "team1" && b.team === "team2") return -1;
    if (a.team === "team2" && b.team === "team1") return 1;
    return 0;
  });

  const teamSelectionSubmit = (values: teams) => {
    setTeam1(values.team1);
    setTeam2(values.team2);
    // Reset the players on team change
    setPlayers(
      players.map((player) => ({
        id: player.id.toString(),
        name: player.name,
        team: "none",
      }))
    );
  };

  // Render a single player card
  const renderPlayer = ({ item }: { item: Player }) => (
    <View style={styles.card}>
      <Text style={styles.playerName}>{item.name}</Text>
      <View style={styles.iconContainer}>
        <TouchableOpacity onPress={() => assignToTeam(item.id, "team1")}>
          <Icon
            name="check-circle"
            type="EvilIcons"
            color={item.team === "team1" ? "#81C784" : "#CCCCCC"}
            size={30}
            style={styles.icon}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => assignToTeam(item.id, "team2")}>
          <Icon
            name="check-circle"
            type="EvilIcons"
            size={30}
            color={item.team === "team2" ? "#64B5F6" : "#CCCCCC"}
            style={styles.icon}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerText, styles.headerPlayerName]}>Player</Text>
        <View style={styles.headerIcons}>
          <Text style={styles.headerText}>{team1?.teamInitials}</Text>
          <Text style={styles.headerText}>{team2?.teamInitials}</Text>
        </View>
      </View>
      <FlatList
        data={sortedPlayers}
        keyExtractor={(item) => item.id}
        renderItem={renderPlayer}
      />
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.configButton}
          onPress={() => {
            setTeamSelectionVisible(true);
          }}
        >
          <Icon name="swap" type="entypo" color="white"></Icon>
          <Text style={styles.saveButtonText}> Change team</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.configButton} onPress={randomizeTeams}>
          <Icon name="random" type="font-awesome" color="white"></Icon>
          <Text style={styles.saveButtonText}>Randomize</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.saveButton} onPress={saveTeams}>
          <Text style={styles.saveButtonText}>Preview and save</Text>
        </TouchableOpacity>
      </View>
      <TeamSelection
        visible={teamSelectionVisible}
        onDismiss={() => setTeamSelectionVisible(false)}
        onSubmit={teamSelectionSubmit}
      />
      <PreviewTeam
        visible={previewTeamVisible}
        players={players}
        team1={team1}
        team2={team2}
        onSave={handleSaveAfterReview}
        onDismiss={() => setPreviewTeamVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#121212", // Dark background
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333", // Darker border
  },
  headerText: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    color: "#ffffff", // White text color
  },
  headerPlayerName: {
    flex: 2,
    textAlign: "left",
  },
  headerIcons: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    marginVertical: 5,
    backgroundColor: "#1e1e1e", // Darker card background
    borderRadius: 5,
    elevation: 1,
  },
  playerName: {
    fontSize: 18,
    flex: 2,
    color: "#ffffff", // White text color
  },
  iconContainer: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around",
  },
  icon: {
    marginHorizontal: 10,
  },
  saveButton: {
    flexDirection: "row",
    flex: 1,
    backgroundColor: "#0c66e4",
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: 5,
    borderRadius: 25,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  configButton: {
    flexDirection: "row",
    flex: 1,
    backgroundColor: "green",
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: 5,
    borderRadius: 25,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    marginLeft: 5, // Add space between icon and text
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginVertical: 5,
  },
});

// Export the TeamLineup component
export default TeamLineup;
