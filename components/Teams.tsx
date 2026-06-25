import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppContext } from "@/context/AppContext";
import { Team } from "@/firebase/models/Team";
import { Match } from "@/firebase/models/Match";
import { TeamPlayerMapping } from "@/firebase/models/TeamPlayerMapping";
import { Player } from "@/firebase/models/Player";
import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Button, Searchbar, IconButton } from "react-native-paper";
import { useFocusEffect, useRouter } from "expo-router";
import { player } from "@/types/player";

// Map of team ID to players
type TeamPlayersMap = { [teamId: string]: player[] };

const Teams = () => {
  const { currentTheme, club, currentTournament } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const insets = useSafeAreaInsets();
  const [teams, setTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<player[]>([]);
  const [teamPlayersMap, setTeamPlayersMap] = useState<TeamPlayersMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [isAddPlayerModalVisible, setIsAddPlayerModalVisible] = useState(false);
  const [selectedTeamInitials, setSelectedTeamInitials] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLiveMatchOngoing, setIsLiveMatchOngoing] = useState(false);
  // True when a live match exists in the current tournament — editing or
  // disabling ANY team is blocked while it runs.
  const [isTeamMutationLocked, setIsTeamMutationLocked] = useState(false);
  // Soft-deleted teams, shown in a separate "Disabled" section for restoring.
  const [disabledTeams, setDisabledTeams] = useState<Team[]>([]);

  const router = useRouter();

  const [mainSearchQuery, setMainSearchQuery] = useState("");

  const filteredTeams = teams.filter((team) => {
    if (!mainSearchQuery) return true;
    const query = mainSearchQuery.toLowerCase();
    const teamNameMatch = team.teamName.toLowerCase().includes(query);
    const players = teamPlayersMap[team.teamInitials] || [];
    const playerMatch = players.some((p) =>
      p.name.toLowerCase().includes(query),
    );
    return teamNameMatch || playerMatch;
  });

  useEffect(() => {
    if (mainSearchQuery) {
      const newExpanded = new Set<string>();
      filteredTeams.forEach((team) => {
        const players = teamPlayersMap[team.teamInitials] || [];
        const playerMatch = players.some((p) =>
          p.name.toLowerCase().includes(mainSearchQuery.toLowerCase()),
        );
        if (playerMatch) {
          newExpanded.add(team.teamInitials);
        }
      });
      if (newExpanded.size > 0) {
        setExpandedTeams(newExpanded);
      }
    }
  }, [mainSearchQuery, teams]);

  const fetchTeamsAndPlayers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch active teams (sorted by name) and disabled teams separately
      const fetchedTeams = await Team.getAllByClubId(club.id);
      fetchedTeams.sort((a, b) => a.teamName.localeCompare(b.teamName));
      setTeams(fetchedTeams);

      const fetchedDisabledTeams = await Team.getDisabledByClubId(club.id);
      fetchedDisabledTeams.sort((a, b) => a.teamName.localeCompare(b.teamName));
      setDisabledTeams(fetchedDisabledTeams);

      // Fetch all players for the club
      const fetchedAllPlayers = await Player.getAllFromClub(club.id);
      setAllPlayers(fetchedAllPlayers);

      // Fetch all team-player mappings for the club
      const mappings = await TeamPlayerMapping.getAllFromClub(club.id);

      const matches = await Match.getAllOrderby(
        club.id,
        "startDateTime",
        "desc",
      );
      // Any live match in the club — gates player roster changes.
      setIsLiveMatchOngoing(matches.some((m) => m.status === "live"));
      // A live match in the current tournament — blocks editing/disabling any
      // team so a mid-tournament rename can't confuse live scoring/standings.
      setIsTeamMutationLocked(
        matches.some(
          (m) => m.status === "live" && m.tournamentId === currentTournament,
        ),
      );

      // Build a map of team ID to players
      const playersMap: TeamPlayersMap = {};
      mappings.forEach((mapping) => {
        playersMap[mapping.team] = mapping.players || [];
      });
      setTeamPlayersMap(playersMap);
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setIsLoading(false);
    }
  }, [club.id, currentTournament]);

  // Re-fetch on focus so renames made on the edit screen show on return.
  useFocusEffect(
    useCallback(() => {
      fetchTeamsAndPlayers();
    }, [fetchTeamsAndPlayers]),
  );

  const handleAddTeam = () => {
    router.push("/createTeam");
  };

  const handleEditTeam = (team: Team) => {
    // Block edits while a match in the current tournament is live: the live
    // scoreboard shows the name captured when the match started, so a rename
    // wouldn't reflect there and would confuse whoever is scoring.
    if (isTeamMutationLocked) {
      Alert.alert(
        "Action Restricted",
        "There is a live match in this tournament. Finish it before editing any team.",
      );
      return;
    }
    router.push({ pathname: "/editTeam", params: { teamId: team.id } });
  };

  const handleDisableTeam = (team: Team) => {
    if (isTeamMutationLocked) {
      Alert.alert(
        "Can't disable this team",
        "There is a live match in this tournament. Finish it before disabling any team.",
      );
      return;
    }

    Alert.alert(
      "Disable team?",
      `"${team.teamName}" will be hidden from the teams list and match setup. Its players will be released back to the available pool. You can restore the team later.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: async () => {
            try {
              // Release the roster so the players become available again, then
              // mark the team disabled.
              await TeamPlayerMapping.createOrUpdate(
                team.teamInitials,
                club.id,
                [],
              );
              await team.update({ enabled: false });
              await fetchTeamsAndPlayers();
            } catch (error) {
              console.error("Error disabling team:", error);
              Alert.alert(
                "Error",
                "Failed to disable the team. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleRestoreTeam = (team: Team) => {
    Alert.alert(
      "Restore team?",
      `"${team.teamName}" will reappear in the teams list and match setup. It will start with no players, so add them again as needed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            try {
              await team.update({ enabled: true });
              await fetchTeamsAndPlayers();
            } catch (error) {
              console.error("Error restoring team:", error);
              Alert.alert(
                "Error",
                "Failed to restore the team. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const toggleTeamExpanded = (teamId: string) => {
    setExpandedTeams((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const getPlayersForTeam = (teamInitials: string): player[] => {
    return teamPlayersMap[teamInitials] || [];
  };

  const getAvailablePlayers = () => {
    const assignedPlayerIds = new Set<string>();
    Object.values(teamPlayersMap).forEach((players) => {
      players.forEach((p) => assignedPlayerIds.add(p.id));
    });

    return allPlayers.filter(
      (p) =>
        !assignedPlayerIds.has(p.id) &&
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const handleOpenAddPlayerModal = (teamInitials: string) => {
    setSelectedTeamInitials(teamInitials);
    setSearchQuery("");
    setIsAddPlayerModalVisible(true);
  };

  const handleAddPlayerToTeam = async (playerToAdd: player) => {
    if (!selectedTeamInitials) return;

    try {
      const currentPlayers = teamPlayersMap[selectedTeamInitials] || [];
      const updatedPlayers = [...currentPlayers, playerToAdd];

      // Optimistic update
      const newTeamPlayersMap = {
        ...teamPlayersMap,
        [selectedTeamInitials]: updatedPlayers,
      };
      setTeamPlayersMap(newTeamPlayersMap);

      await TeamPlayerMapping.createOrUpdate(
        selectedTeamInitials,
        club.id,
        updatedPlayers,
      );
      setIsAddPlayerModalVisible(false);
    } catch (error) {
      console.error("Error adding player to team:", error);
      // Revert changes if needed (not implemented for simplicity, but good practice)
    }
  };

  const handleRemovePlayerFromTeam = async (
    teamInitials: string,
    playerId: string,
  ) => {
    try {
      const currentPlayers = teamPlayersMap[teamInitials] || [];
      const updatedPlayers = currentPlayers.filter((p) => p.id !== playerId);

      // Optimistic update
      const newTeamPlayersMap = {
        ...teamPlayersMap,
        [teamInitials]: updatedPlayers,
      };
      setTeamPlayersMap(newTeamPlayersMap);

      await TeamPlayerMapping.createOrUpdate(
        teamInitials,
        club.id,
        updatedPlayers,
      );
    } catch (error) {
      console.error("Error removing player from team:", error);
    }
  };

  const renderAddPlayerModal = () => (
    <Modal
      visible={isAddPlayerModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setIsAddPlayerModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, themeStyles.card]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, themeStyles.text]}>
              Add Player to{" "}
              {teams.find((t) => t.teamInitials === selectedTeamInitials)
                ?.teamShortName ?? selectedTeamInitials}
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setIsAddPlayerModalVisible(false)}
              iconColor={currentTheme === "dark" ? "#FFF" : "#000"}
            />
          </View>

          <Searchbar
            placeholder="Search players"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.searchBar, themeStyles.searchBar]}
            inputStyle={themeStyles.text}
            iconColor={currentTheme === "dark" ? "#AAA" : "#666"}
            placeholderTextColor={currentTheme === "dark" ? "#888" : "#999"}
          />

          <FlatList
            data={getAvailablePlayers()}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalPlayerItem,
                  {
                    borderBottomColor:
                      currentTheme === "dark" ? "#333" : "#E9ECEF",
                  },
                ]}
                onPress={() => handleAddPlayerToTeam(item)}
              >
                <View
                  style={[
                    styles.playerAvatar,
                    {
                      backgroundColor:
                        currentTheme === "dark" ? "#00C4B4" : "#8E24AA",
                      marginRight: 12,
                    },
                  ]}
                >
                  <Text style={styles.playerAvatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.modalPlayerName, themeStyles.text]}>
                  {item.name}
                </Text>
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={currentTheme === "dark" ? "#00C4B4" : "#8E24AA"}
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <Text style={[styles.emptyStateText, themeStyles.subText]}>
                No available players found
              </Text>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View
      style={[
        styles.container,
        themeStyles.container,
        { paddingBottom: insets.bottom, paddingTop: insets.top },
      ]}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <Searchbar
          placeholder="Search teams or players"
          onChangeText={setMainSearchQuery}
          value={mainSearchQuery}
          style={[styles.mainSearchBar, themeStyles.searchBar]}
          inputStyle={themeStyles.text}
          iconColor={currentTheme === "dark" ? "#AAA" : "#666"}
          placeholderTextColor={currentTheme === "dark" ? "#888" : "#999"}
        />
      </View>

      <View style={styles.scrollWrapper}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, themeStyles.subText]}>
                Loading teams...
              </Text>
            </View>
          ) : filteredTeams.length === 0 ? (
            <View style={styles.emptyState}>
              {teams.length === 0 ? (
                <>
                  <Ionicons
                    name="people-outline"
                    size={48}
                    color={currentTheme === "dark" ? "#666" : "#999"}
                  />
                  <Text style={[styles.emptyStateText, themeStyles.subText]}>
                    No teams yet. Create your first team!
                  </Text>
                </>
              ) : (
                <Text style={[styles.emptyStateText, themeStyles.subText]}>
                  No teams or players found matching "{mainSearchQuery}"
                </Text>
              )}
            </View>
          ) : (
            filteredTeams.map((team) => {
              const players = getPlayersForTeam(team.teamInitials);
              const isExpanded = expandedTeams.has(team.teamInitials);

              return (
                <Pressable
                  key={team.id}
                  style={[styles.card, themeStyles.card]}
                  onPress={() => toggleTeamExpanded(team.teamInitials)}
                  android_ripple={{
                    color: currentTheme === "dark" ? "#333" : "#f0f0f0",
                  }}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.teamInfo}>
                      <Ionicons
                        name="people"
                        size={24}
                        color={currentTheme === "dark" ? "#00C4B4" : "#8E24AA"}
                      />
                      <View style={styles.teamDetails}>
                        <Text style={[styles.teamName, themeStyles.text]}>
                          {team.teamName}
                        </Text>
                        <Text
                          style={[styles.teamInitials, themeStyles.subText]}
                        >
                          {team.teamShortName} • {players.length} player
                          {players.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.headerRight}>
                      <IconButton
                        icon="pencil-outline"
                        size={18}
                        onPress={() => handleEditTeam(team)}
                        iconColor={currentTheme === "dark" ? "#888" : "#999"}
                        style={styles.headerActionIcon}
                      />
                      <IconButton
                        icon="archive-arrow-down-outline"
                        size={18}
                        onPress={() => handleDisableTeam(team)}
                        iconColor={currentTheme === "dark" ? "#888" : "#999"}
                        style={styles.headerActionIcon}
                      />
                      <View
                        style={[
                          styles.initialsBadge,
                          {
                            backgroundColor:
                              currentTheme === "dark" ? "#333" : "#E9ECEF",
                          },
                        ]}
                      >
                        <Text
                          style={[styles.initialsBadgeText, themeStyles.text]}
                        >
                          {team.teamShortName}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={currentTheme === "dark" ? "#888" : "#666"}
                        style={styles.expandIcon}
                      />
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.playersSection}>
                      {players.length === 0 ? (
                        <Text
                          style={[styles.noPlayersText, themeStyles.subText]}
                        >
                          No players assigned to this team
                        </Text>
                      ) : (
                        <View style={styles.playersList}>
                          {players.map((player, index) => (
                            <View
                              key={player.id}
                              style={[
                                styles.playerItem,
                                {
                                  borderBottomWidth:
                                    index < players.length - 1 ? 1 : 0,
                                  borderBottomColor:
                                    currentTheme === "dark"
                                      ? "#333"
                                      : "#E9ECEF",
                                },
                              ]}
                            >
                              <View style={styles.playerInfo}>
                                <View
                                  style={[
                                    styles.playerAvatar,
                                    {
                                      backgroundColor:
                                        currentTheme === "dark"
                                          ? "#00C4B4"
                                          : "#8E24AA",
                                    },
                                  ]}
                                >
                                  <Text style={styles.playerAvatarText}>
                                    {player.name.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                                <Text
                                  style={[styles.playerName, themeStyles.text]}
                                >
                                  {player.name}
                                </Text>
                              </View>
                              <View style={styles.playerRight}>
                                <Text
                                  style={[
                                    styles.playerNumber,
                                    themeStyles.subText,
                                  ]}
                                >
                                  #{index + 1}
                                </Text>
                                {!isLiveMatchOngoing && (
                                  <IconButton
                                    icon="trash-can-outline"
                                    size={20}
                                    onPress={() =>
                                      handleRemovePlayerFromTeam(
                                        team.teamInitials,
                                        player.id,
                                      )
                                    }
                                    iconColor={
                                      currentTheme === "dark"
                                        ? "#FF6B6B"
                                        : "#D32F2F"
                                    }
                                  />
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                      <Button
                        mode="outlined"
                        icon="account-plus"
                        onPress={() => {
                          if (isLiveMatchOngoing) {
                            Alert.alert(
                              "Action Restricted",
                              "Cannot add players while a match is ongoing.",
                            );
                            return;
                          }
                          handleOpenAddPlayerModal(team.teamInitials);
                        }}
                        disabled={isLiveMatchOngoing}
                        style={{
                          marginTop: 12,
                          borderColor: isLiveMatchOngoing
                            ? "#666"
                            : currentTheme === "dark"
                              ? "#00C4B4"
                              : "#8E24AA",
                          opacity: isLiveMatchOngoing ? 0.5 : 1,
                        }}
                        textColor={
                          isLiveMatchOngoing
                            ? "#666"
                            : currentTheme === "dark"
                              ? "#00C4B4"
                              : "#8E24AA"
                        }
                      >
                        {isLiveMatchOngoing
                          ? "Match in Progress"
                          : "Add Player"}
                      </Button>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}

          {!mainSearchQuery && disabledTeams.length > 0 && (
            <View style={styles.disabledSection}>
              <Text style={[styles.disabledSectionTitle, themeStyles.subText]}>
                DISABLED TEAMS
              </Text>
              {disabledTeams.map((team) => (
                <View
                  key={team.id}
                  style={[styles.card, themeStyles.card, styles.disabledCard]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.teamInfo}>
                      <Ionicons
                        name="people-outline"
                        size={24}
                        color={currentTheme === "dark" ? "#777" : "#AAA"}
                      />
                      <View style={styles.teamDetails}>
                        <Text style={[styles.teamName, themeStyles.subText]}>
                          {team.teamName}
                        </Text>
                        <Text
                          style={[styles.teamInitials, themeStyles.subText]}
                        >
                          {team.teamShortName} • Disabled
                        </Text>
                      </View>
                    </View>
                    <Button
                      mode="outlined"
                      icon="archive-arrow-up-outline"
                      compact
                      onPress={() => handleRestoreTeam(team)}
                      textColor={
                        currentTheme === "dark" ? "#00C4B4" : "#8E24AA"
                      }
                      style={{
                        borderColor:
                          currentTheme === "dark" ? "#00C4B4" : "#8E24AA",
                      }}
                    >
                      Restore
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <View style={styles.addButtonContainer}>
        <Button
          mode="contained"
          onPress={handleAddTeam}
          icon="plus"
          buttonColor={currentTheme === "dark" ? "#00C4B4" : "#8E24AA"}
          textColor="#FFFFFF"
          style={styles.addButton}
        >
          Add New Team
        </Button>
      </View>
      {renderAddPlayerModal()}
    </View>
  );
};

export default Teams;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: "600",
  },
  teamInitials: {
    fontSize: 14,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionIcon: {
    margin: 0,
  },
  disabledSection: {
    marginTop: 8,
  },
  disabledSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  disabledCard: {
    opacity: 0.7,
  },
  initialsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  initialsBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  expandIcon: {
    marginLeft: 4,
  },
  playersSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  playersList: {
    gap: 0,
  },
  playerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  playerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  playerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  playerAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  playerName: {
    fontSize: 16,
  },
  playerNumber: {
    fontSize: 14,
  },
  noPlayersText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
  },
  addButtonContainer: {
    padding: 20,
    paddingTop: 10,
  },
  addButton: {
    borderRadius: 8,
    paddingVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  searchBar: {
    marginBottom: 16,
    borderRadius: 8,
    height: 40,
  },
  mainSearchBar: {
    marginBottom: 10,
    borderRadius: 8,
    height: 46,
    elevation: 2,
  },
  modalPlayerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalPlayerName: {
    fontSize: 16,
    flex: 1,
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#121212",
  },
  card: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#333",
  },
  text: {
    color: "#FFFFFF",
  },
  subText: {
    color: "#AAAAAA",
  },
  searchBar: {
    backgroundColor: "#2C2C2C",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#F8F9FA",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  text: {
    color: "#212529",
  },
  subText: {
    color: "#6C757D",
  },
  searchBar: {
    backgroundColor: "#F0F0F0",
  },
});
