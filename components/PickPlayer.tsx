import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { Button, Text, Searchbar } from "react-native-paper";
import Modal from "react-native-modal";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { player } from "@/types/player";
import { playerStats } from "@/types/playerStats";
import { useTheme } from "@/context/ThemeContext";
import { playerCareerStats } from "@/types/playerCareerStats";
import { Player } from "@/firebase/models/Player";
import { PlayerCareerStats } from "@/firebase/models/PlayerCareerStats";

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
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  useEffect(() => {
    (async () => {
      if (team) {
        let playersFromDb = await Player.getAll();
        let playerStatsFromDb: (playerCareerStats & {
          isRecommendedBowler?: boolean;
          isRecommendedBatter?: boolean;
        })[] = await PlayerCareerStats.getAll();
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

  const renderItem = ({ item }: { item: player }) => (
    <TouchableOpacity
      style={[styles.playerItem, themeStyles.playerItem]}
      onPress={() => {
        onSubmit(item);
        onDismiss();
      }}
    >
      <Text style={[styles.playerName, themeStyles.text]}>{item.name}</Text>
      <Text style={[styles.playerName, themeStyles.text]}>
        {playerType === "Batsman" ? (
          playerStats.find((p) => p.playerId === item.id)
            ?.isRecommendedBatter ? (
            <View>
              <View
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: "green",
                  borderRadius: 5,
                }}
              ></View>
            </View>
          ) : (
            ""
          )
        ) : playerStats.find((p) => p.playerId === item.id)
            ?.isRecommendedBowler ? (
          <View
            style={{
              width: 10,
              height: 10,
              backgroundColor: "green",
              borderRadius: 5,
            }}
          ></View>
        ) : (
          ""
        )}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onDismiss}
      onBackButtonPress={onDismiss}
      swipeDirection="down"
      onSwipeComplete={onDismiss}
      style={styles.modal}
    >
      <View style={[styles.container, themeStyles.container]}>
        <Text style={[styles.headerText, themeStyles.headerText]}>
          {playerType === "Bowler" ? "Select Bowler" : "Select Next Batsman"}
        </Text>
        {/* <Searchbar
          placeholder="Search players"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, themeStyles.searchBar]}
          inputStyle={themeStyles.searchBarInput}
          iconColor={themeStyles.searchBarIcon.color}
        /> */}
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  container: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  searchBar: {
    marginBottom: 16,
    elevation: 0,
  },
  list: {
    marginBottom: 4,
    marginRight: 4, // Increased margin to accommodate the scrollbar
  },
  playerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#1E1E1E",
  },
  headerText: {
    color: "#FFFFFF",
  },
  text: {
    color: "#FFFFFF",
  },
  playerItem: {
    backgroundColor: "#2C2C2C",
  },
  searchBar: {
    backgroundColor: "#2C2C2C",
  },
  searchBarInput: {
    color: "#FFFFFF",
  },
  searchBarIcon: {
    color: "#FFFFFF",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
  },
  headerText: {
    color: "#212121",
  },
  text: {
    color: "#212121",
  },
  playerItem: {
    backgroundColor: "#F0F0F0", // Slightly darker background for better contrast
  },
  searchBar: {
    backgroundColor: "#F0F0F0",
  },
  searchBarInput: {
    color: "#212121",
  },
  searchBarIcon: {
    color: "#666666",
  },
});

export default PickPlayer;
