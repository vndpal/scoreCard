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
  const batterStats = playerMatchStats.find(
    (playerStat) => playerStat.playerId == strikerBatsman?.id
  );
  const bowlerStats = playerMatchStats.find(
    (playerStat) => playerStat.playerId == bowler?.id
  );
  const nonStrikerBatter = playerMatchStats.find(
    (playerStat) => playerStat.playerId == nonStrikerBatsman?.id
  );

  return (
    <View style={styles.statsBar}>
      <View style={styles.batterContainer}>
        <View style={[styles.batter, styles.striker]}>
          <Text style={styles.batsmanName}>
            {strikerBatsman?.name?.slice(0, 10)}
          </Text>
          <Text style={styles.batsmanStats}>
            {batterStats?.runs} ({batterStats?.ballsFaced})
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bubbleButton}
          onPress={handleSwapBatters}
        >
          <Icon name="swap" type="entypo" color="#d0d0d0" size={20} />
        </TouchableOpacity>
        <View style={styles.batter}>
          <Text style={styles.batsmanName}>
            {nonStrikerBatsman?.name?.slice(0, 10)}
          </Text>
          <Text style={styles.batsmanStats}>
            {nonStrikerBatter?.runs} ({nonStrikerBatter?.ballsFaced})
          </Text>
        </View>
      </View>
      <View style={styles.bowlerContainer}>
        <Text style={styles.bowlerName}>{bowler?.name?.slice(0, 10)}</Text>
        <Text style={styles.bowlerStats}>
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
    backgroundColor: "#1e1e1e",
    width: windowWidth,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    borderTopWidth: 1,
    borderTopColor: "#333",
    shadowColor: "#000000",
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
    borderBottomColor: "#f39c12",
    paddingBottom: 5,
  },
  batsmanName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f5f5f5",
  },
  batsmanStats: {
    fontSize: 14,
    color: "#b0b0b0",
  },
  bowlerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f5f5f5",
  },
  bowlerStats: {
    fontSize: 14,
    color: "#b0b0b0",
  },
  bubbleButton: {
    width: windowWidth * 0.13,
    height: windowWidth * 0.07,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    marginHorizontal: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#a0a0a0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    overflow: "hidden",
  },
});
