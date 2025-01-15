import { player } from "@/types/player";
import { playerStats } from "@/types/playerStats";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Icon } from "react-native-elements";
import { useTheme } from "@/context/ThemeContext";

const windowWidth = Dimensions.get("window").width;

const MatchPlayerStatsBar = ({
  strikerBatsman,
  nonStrikerBatsman,
  bowler,
  playerMatchStats,
  isOut,
  handleOutBatter,
  handleSwapBatters,
  handleEditPlayer,
}: {
  strikerBatsman: player | undefined;
  nonStrikerBatsman: player | undefined;
  bowler: player | undefined;
  playerMatchStats: playerStats[];
  isOut: boolean;
  handleOutBatter: (outBatter: player) => void;
  handleSwapBatters: () => void;
  handleEditPlayer: (playerType: "striker" | "nonStriker" | "bowler") => void;
}) => {
  const { currentTheme } = useTheme();

  const batterStats = playerMatchStats.find(
    (playerStat) => playerStat.playerId == strikerBatsman?.id
  );
  const bowlerStats = playerMatchStats.find(
    (playerStat) => playerStat.playerId == bowler?.id
  );
  const nonStrikerBatter = playerMatchStats.find(
    (playerStat) => playerStat.playerId == nonStrikerBatsman?.id
  );

  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const handleOut = (outBatter: player) => {
    handleOutBatter(outBatter);
  };

  return (
    <View style={[styles.statsBar, themeStyles.statsBar]}>
      <TouchableOpacity
        style={[
          styles.batter,
          styles.striker,
          themeStyles.batter,
          themeStyles.striker,
          isOut && styles.highlightOutBatter,
        ]}
        disabled={!isOut}
        onPress={() => handleOut(strikerBatsman!)}
      >
        <View style={styles.playerNameContainer}>
          {strikerBatsman &&
          batterStats &&
          batterStats.runs == 0 &&
          batterStats.ballsFaced == 0 ? (
            <TouchableOpacity
              disabled={isOut}
              onPress={() => handleEditPlayer("striker")}
              style={styles.removablePlayer}
            >
              <Text
                style={[
                  styles.batsmanName,
                  themeStyles.batsmanName,
                  styles.removableText,
                ]}
              >
                {strikerBatsman?.name?.slice(0, 8)}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.batsmanName, themeStyles.batsmanName]}>
              {strikerBatsman?.name?.slice(0, 8)}
            </Text>
          )}
        </View>
        <Text style={[styles.batsmanStats, themeStyles.batsmanStats]}>
          {batterStats?.runs} ({batterStats?.ballsFaced})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.bubbleButton, themeStyles.bubbleButton]}
        onPress={handleSwapBatters}
      >
        <Icon
          name="swap"
          type="entypo"
          color={currentTheme == "dark" ? "#d0d0d0" : "black"}
          size={20}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.batter,
          themeStyles.batter,
          isOut && styles.highlightOutBatter,
        ]}
        disabled={!isOut}
        onPress={() => handleOut(nonStrikerBatsman!)}
      >
        <View style={styles.playerNameContainer}>
          {nonStrikerBatsman &&
          nonStrikerBatter &&
          nonStrikerBatter.runs == 0 &&
          nonStrikerBatter.ballsFaced == 0 ? (
            <TouchableOpacity
              disabled={isOut}
              onPress={() => handleEditPlayer("nonStriker")}
              style={styles.removablePlayer}
            >
              <Text
                style={[
                  styles.batsmanName,
                  themeStyles.batsmanName,
                  styles.removableText,
                ]}
              >
                {nonStrikerBatsman?.name?.slice(0, 8)}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.batsmanName, themeStyles.batsmanName]}>
              {nonStrikerBatsman?.name?.slice(0, 8)}
            </Text>
          )}
        </View>
        <Text style={[styles.batsmanStats, themeStyles.batsmanStats]}>
          {nonStrikerBatter
            ? `${nonStrikerBatter.runs} (${nonStrikerBatter.ballsFaced})`
            : "N/A"}
        </Text>
      </TouchableOpacity>
      <View style={[styles.bowlerContainer, themeStyles.bowlerContainer]}>
        <View style={styles.playerNameContainer}>
          {bowler &&
          bowlerStats &&
          bowlerStats.ballsBowled == 0 &&
          bowlerStats.runsConceded == 0 ? (
            <TouchableOpacity
              onPress={() => handleEditPlayer("bowler")}
              style={styles.removablePlayer}
            >
              <Text
                style={[
                  styles.bowlerName,
                  themeStyles.bowlerName,
                  styles.removableText,
                ]}
              >
                {bowler?.name?.slice(0, 8)}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.bowlerName, themeStyles.bowlerName]}>
              {bowler?.name?.slice(0, 8)}
            </Text>
          )}
        </View>
        <Text style={[styles.bowlerStats, themeStyles.bowlerStats]}>
          {bowlerStats?.runsConceded}/{bowlerStats?.wickets} (
          {bowlerStats?.overs}.{bowlerStats?.ballsBowled})
        </Text>
      </View>
    </View>
  );
};

export default MatchPlayerStatsBar;

const styles = StyleSheet.create({
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 6,
    width: windowWidth,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  batter: {
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    width: "26%",
    borderLeftWidth: 2,
    borderLeftColor: "#f39c12",
  },
  striker: {
    borderLeftWidth: 3,
    borderLeftColor: "#e74c3c",
    backgroundColor: "#f7f7f7",
  },
  bowlerContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    width: "30%",
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    padding: 4,
    borderLeftWidth: 2,
    borderLeftColor: "#4a90e2",
  },
  bubbleButton: {
    width: windowWidth * 0.06,
    height: windowWidth * 0.06,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    shadowOpacity: 0.1,
    elevation: 1,
  },
  batterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "60%",
  },
  batsmanName: {
    fontSize: 14, // Slightly bigger font for names
    fontWeight: "600", // More bold
    color: "#444", // Darker color for better visibility
    marginBottom: 1, // Small spacing before stats
  },
  batsmanStats: {
    fontSize: 14.5, // Slightly bigger than name
    fontWeight: "500", // Medium weight
    color: "#222", // Darker than name but not black
    marginTop: 1,
  },
  bowlerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 1,
  },
  bowlerStats: {
    fontSize: 14.5,
    fontWeight: "500",
    color: "#222",
    marginTop: 1,
  },
  highlightOutBatter: {
    backgroundColor: "#e0f7fa",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  playerNameContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  removablePlayer: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: "#e1e1e1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  removableText: {
    color: "#505050",
    fontWeight: "600",
    fontSize: 14,
    paddingHorizontal: 6,
    paddingVertical: 1,
    textAlign: "center",
  },
});

const darkStyles = StyleSheet.create({
  statsBar: {
    backgroundColor: "#1e1e1e",
    borderBottomColor: "#333",
    borderTopColor: "#333",
    shadowColor: "#000000",
  },
  batter: {
    backgroundColor: "#2a2a2a",
    borderLeftColor: "#f39c12",
  },
  striker: {
    borderLeftColor: "#e74c3c",
    backgroundColor: "#333333",
  },
  bowlerContainer: {
    backgroundColor: "#2a2a2a",
    borderLeftColor: "#4a90e2",
  },
  bubbleButton: {
    backgroundColor: "#333333",
    borderColor: "#555555",
  },
  batsmanName: {
    color: "#d0d0d0", // Brighter in dark mode
  },
  batsmanStats: {
    color: "#ffffff", // Pure white for stats
  },
  bowlerName: {
    color: "#d0d0d0",
  },
  bowlerStats: {
    color: "#ffffff",
  },
});

const lightStyles = StyleSheet.create({
  statsBar: {
    backgroundColor: "#f9f9f9",
    borderBottomColor: "#cccccc",
    borderTopColor: "#cccccc",
    shadowColor: "#888888",
  },
  batter: {
    backgroundColor: "#f5f5f5",
    borderLeftColor: "#f39c12",
  },
  striker: {
    borderLeftColor: "#e74c3c",
    backgroundColor: "#f7f7f7",
  },
  bowlerContainer: {
    backgroundColor: "#f5f5f5",
    borderLeftColor: "#4a90e2",
  },
  bubbleButton: {
    backgroundColor: "#ffffff",
    borderColor: "#dddddd",
  },
  batsmanName: {
    color: "#444",
  },
  batsmanStats: {
    color: "#222",
  },
  bowlerName: {
    color: "#444",
  },
  bowlerStats: {
    color: "#222",
  },
});
