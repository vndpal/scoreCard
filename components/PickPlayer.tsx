import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, Searchbar } from "react-native-paper";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { player } from "@/types/player";
import { playerStats } from "@/types/playerStats";
import { useAppContext } from "@/context/AppContext";
import { playerCareerStats } from "@/types/playerCareerStats";
import { Player } from "@/firebase/models/Player";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";
import { PlayerTournamentStats } from "@/firebase/models/PlayerTournamentStats";

interface PlayerWithStats extends playerCareerStats {
  isRecommendedBowler?: boolean;
  isRecommendedBatter?: boolean;
}

interface PickPlayerProps {
  visible: boolean;
  team: string;
  playerType: string;
  remainingPlayers: playerStats[];
  onDismiss: () => void;
  onSubmit: (values: player | undefined) => void;
}

const PickPlayer: React.FC<PickPlayerProps> = ({
  visible,
  team,
  remainingPlayers,
  playerType,
  onDismiss,
  onSubmit,
}) => {
  const [players, setPlayers] = useState<player[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentTheme, currentTournament } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      if (visible) {
        setIsSubmitting(false);
      }
      if (team) {
        let playersFromDb = await Player.getAllFromCache();
        let playerStatsFromDb: (PlayerTournamentStats & {
          isRecommendedBowler?: boolean;
          isRecommendedBatter?: boolean;
        })[] = await PlayerTournamentStats.getFromCache(currentTournament);

        if (playerStatsFromDb && playerStatsFromDb.length > 0) {
          const halfPlayers = Math.ceil(playerStatsFromDb.length / 3);

          // Sort bowlers by least overs bowled
          const sortedBowlers = [...playerStatsFromDb].sort(
            (a: playerCareerStats, b: playerCareerStats) => a.overs - b.overs
          );
          sortedBowlers.slice(0, halfPlayers).forEach((bowler) => {
            bowler.isRecommendedBowler = true;
          });

          // Sort batsmen by least (innings - notOuts)
          const sortedBatsmen = [...playerStatsFromDb].sort(
            (a: playerCareerStats, b: playerCareerStats) => {
              const aValue = a.innings - a.notOuts;
              const bValue = b.innings - b.notOuts;
              return aValue - bValue;
            }
          );
          sortedBatsmen.slice(0, halfPlayers).forEach((batsman) => {
            batsman.isRecommendedBatter = true;
          });

          setPlayerStats(playerStatsFromDb);
        }
        if (playersFromDb) {
          remainingPlayers = remainingPlayers.filter((p) => p.team === team);
          playersFromDb = playersFromDb.filter((p: player) =>
            remainingPlayers.map((x) => x.playerId).includes(p.id.toString())
          );
          playersFromDb.sort((a: player, b: player) =>
            a.name.localeCompare(b.name)
          );
          setPlayers(playersFromDb);
        }
      }
    })();
  }, [visible]);

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStatsHeader = () => (
    <View style={[styles.statsHeader, themeStyles.statsHeader]}>
      <Text style={[styles.playerName, themeStyles.text]}>Player</Text>
      <View style={styles.rightBlock}>
        <View style={styles.statsRow}>
          {playerType === "Batsman" ? (
            <>
              <View style={styles.statCellHeader}>
                <Text style={[styles.headerLabel, themeStyles.headerLabel]}>
                  Inns
                </Text>
              </View>
              <View style={styles.statCellHeader}>
                <Text style={[styles.headerLabel, themeStyles.headerLabel]}>
                  Runs
                </Text>
              </View>
              <View style={styles.statCellHeader}>
                <Text style={[styles.headerLabel, themeStyles.headerLabel]}>
                  Balls
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.statCellHeader}>
                <Text style={[styles.headerLabel, themeStyles.headerLabel]}>
                  Overs
                </Text>
              </View>
              <View style={styles.statCellHeader}>
                <Text style={[styles.headerLabel, themeStyles.headerLabel]}>
                  Runs
                </Text>
              </View>
              <View style={styles.statCellHeader}>
                <Text style={[styles.headerLabel, themeStyles.headerLabel]}>
                  Wkts
                </Text>
              </View>
              <View style={styles.statCellHeader}>
                <Text style={[styles.headerLabel, themeStyles.headerLabel]}>
                  Econ
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: player }) => {
    const stats = playerStats.find((p) => p.playerId === item.id);
    const isRecommended =
      playerType === "Batsman"
        ? stats?.isRecommendedBatter
        : stats?.isRecommendedBowler;

    return (
      <TouchableOpacity
        style={[
          styles.playerItem,
          themeStyles.playerItem,
          isRecommended && styles.recommendedPlayer,
        ]}
        onPress={() => {
          if (isSubmitting) return;
          setIsSubmitting(true);
          onSubmit(item);
          onDismiss();
        }}
        disabled={isSubmitting}
      >
        <Text style={[styles.playerName, themeStyles.text]}>{item.name}</Text>
        <View style={styles.rightBlock}>
          <View style={styles.statsRow}>
            {playerType === "Batsman" ? (
              <>
                <View style={styles.statCell}>
                  <Text style={[styles.statsValue, themeStyles.text]}>
                    {stats?.innings || 0}
                  </Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={[styles.statsValue, themeStyles.text]}>
                    {stats?.runs || 0}
                  </Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={[styles.statsValue, themeStyles.text]}>
                    {stats?.ballsFaced || 0}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statCell}>
                  <Text style={[styles.statsValue, themeStyles.text]}>
                    {stats?.overs || 0}.{stats?.ballsBowled || 0}
                  </Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={[styles.statsValue, themeStyles.text]}>
                    {stats?.runsConceded || 0}
                  </Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={[styles.statsValue, themeStyles.text]}>
                    {stats?.wickets || 0}
                  </Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={[styles.statsValue, themeStyles.text]}>
                    {stats && stats.overs > 0
                      ? (stats.runsConceded / stats.overs).toFixed(1)
                      : "0.0"}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onDismiss}
      transparent={true}
      animationType="slide"
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <TouchableWithoutFeedback>
          <View
            style={[
              styles.container,
              themeStyles.container,
              { paddingBottom: insets.bottom + 16 },
            ]}
          >
            <Text style={[styles.headerText, themeStyles.headerText]}>
              {playerType === "Bowler"
                ? "Select Bowler"
                : "Select Next Batsman"}
            </Text>
            {renderStatsHeader()}
            <FlatList
              data={filteredPlayers}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              style={styles.list}
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}
            />
            <Button
              mode="contained"
              onPress={onDismiss}
              style={styles.cancelButton}
              labelStyle={styles.cancelButtonText}
            >
              Cancel
            </Button>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.8,
    color: "#0F172A",
  },
  searchBar: {
    marginBottom: 12,
    elevation: 0,
  },
  list: {
    marginBottom: 12,
    marginRight: 4,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  headerStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#475569",
  },
  playerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    letterSpacing: 0.4,
    color: "#0F172A",
  },
  cancelButton: {
    borderRadius: 10,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: "#FFFFFF",
  },
  rightBlock: {
    flex: 1,
    alignItems: "flex-end",
  },
  statsContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statCellHeader: {
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  statCell: {
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  statsValue: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
    fontFamily: "monospace",
    color: "#475569",
  },
  separator: {
    width: 12,
    height: 2,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  recommendedPlayer: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0F172A",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  headerText: {
    color: "#F8FAFC",
  },
  text: {
    color: "#F1F5F9",
  },
  playerItem: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statsHeader: {
    backgroundColor: "#334155",
    borderWidth: 1,
    borderColor: "#475569",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  headerLabel: {
    color: "#94A3B8",
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  separator: {
    backgroundColor: "#64748B",
  },
  searchBar: {
    backgroundColor: "#1E293B",
  },
  searchBarInput: {
    color: "#F1F5F9",
  },
  searchBarIcon: {
    color: "#94A3B8",
  },
  recommendedPlayer: {
    backgroundColor: "#064E3B",
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
  },
  headerText: {
    color: "#0F172A",
  },
  text: {
    color: "#0F172A",
  },
  playerItem: {
    backgroundColor: "#FFFFFF",
  },
  statsHeader: {
    backgroundColor: "#F1F5F9",
  },
  headerLabel: {
    color: "#475569",
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },
  separator: {
    backgroundColor: "#CBD5E1",
  },
  searchBar: {
    backgroundColor: "#F1F5F9",
  },
  searchBarInput: {
    color: "#0F172A",
  },
  searchBarIcon: {
    color: "#475569",
  },
});

export default PickPlayer;
