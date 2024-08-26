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
  handleSwapBatters,
}: {
  strikerBatsman: player | undefined;
  nonStrikerBatsman: player | undefined;
  bowler: player | undefined;
  playerMatchStats: playerStats[];
  handleSwapBatters: () => void;
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

  return (
    <View style={[styles.statsBar, themeStyles.statsBar]}>
      <View style={styles.batterContainer}>
        <View style={[styles.batter, styles.striker]}>
          <Text style={[styles.batsmanName, themeStyles.batsmanName]}>
            {strikerBatsman?.name?.slice(0, 10)}
          </Text>
          <Text style={[styles.batsmanStats, themeStyles.batsmanStats]}>
            {batterStats?.runs} ({batterStats?.ballsFaced})
          </Text>
        </View>
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
        <View style={styles.batter}>
          <Text style={[styles.batsmanName, themeStyles.batsmanName]}>
            {nonStrikerBatsman?.name?.slice(0, 10)}
          </Text>
          <Text style={[styles.batsmanStats, themeStyles.batsmanStats]}>
            {nonStrikerBatter?.runs} ({nonStrikerBatter?.ballsFaced})
          </Text>
        </View>
      </View>
      <View style={styles.bowlerContainer}>
        <Text style={[styles.bowlerName, themeStyles.bowlerName]}>
          {bowler?.name?.slice(0, 10)}
        </Text>
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
    padding: 10,
    width: windowWidth,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  batterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "60%",
  },
  bowlerContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    width: "40%",
  },
  batter: {
    alignItems: "center",
    paddingHorizontal: 5,
  },
  striker: {
    borderBottomWidth: 2,
    paddingBottom: 5,
    borderBottomColor: "#f39c12",
  },
  batsmanName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  batsmanStats: {
    fontSize: 14,
  },
  bowlerName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  bowlerStats: {
    fontSize: 14,
  },
  bubbleButton: {
    width: windowWidth * 0.13,
    height: windowWidth * 0.07,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    marginHorizontal: 3,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    overflow: "hidden",
  },
});

const darkStyles = StyleSheet.create({
  statsBar: {
    backgroundColor: "#1e1e1e",
    borderBottomColor: "#333",
    borderTopColor: "#333",
    shadowColor: "#000000",
  },
  batsmanName: {
    color: "#f5f5f5",
  },
  batsmanStats: {
    color: "#b0b0b0",
  },
  bowlerName: {
    color: "#f5f5f5",
  },
  bowlerStats: {
    color: "#b0b0b0",
  },
  bubbleButton: {
    backgroundColor: "#444",
    borderColor: "#a0a0a0",
  },
});

const lightStyles = StyleSheet.create({
  statsBar: {
    backgroundColor: "#f9f9f9",
    borderBottomColor: "#cccccc",
    borderTopColor: "#cccccc",
    shadowColor: "#888888",
  },
  batsmanName: {
    color: "#333333",
  },
  batsmanStats: {
    color: "#555555",
  },
  bowlerName: {
    color: "#333333",
  },
  bowlerStats: {
    color: "#555555",
  },
  bubbleButton: {
    backgroundColor: "#e0e0e0",
    borderColor: "black",
  },
});
