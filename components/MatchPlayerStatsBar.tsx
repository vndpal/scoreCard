import { player } from "@/types/player";
import { playerStats } from "@/types/playerStats";
import { View, Text, StyleSheet, Dimensions } from "react-native";

const windowWidth = Dimensions.get("window").width;

const MatchPlayerStatsBar = ({
  strikerBatsman,
  nonStrikerBatsman,
  bowler,
  playerMatchStats,
}: {
  strikerBatsman: player | undefined;
  nonStrikerBatsman: player | undefined;
  bowler: player | undefined;
  playerMatchStats: playerStats[];
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
      <View style={styles.statsContainer}>
        <Text style={styles.batsmanText}>
          <Text style={styles.batsmanName}>{strikerBatsman?.name}</Text>
          <Text style={styles.batsmanStats}>
            * {batterStats?.runs} ({batterStats?.ballsFaced})
          </Text>
          {" | "}
          <Text style={styles.batsmanName}>{nonStrikerBatsman?.name}</Text>
          <Text style={styles.batsmanStats}>
            {" "}
            {nonStrikerBatter?.runs} ({nonStrikerBatter?.ballsFaced})
          </Text>
        </Text>
        <Text style={styles.bowlerText}>
          <Text style={styles.bowlerName}>{bowler?.name}</Text>
          <Text style={styles.bowlerStats}>
            {" "}
            {bowlerStats?.runsConceded}/{bowlerStats?.wickets} (
            {bowlerStats?.overs}.{bowlerStats?.ballsBowled})
          </Text>
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
    backgroundColor: "#282c34", // Dark background
    width: windowWidth,
    borderBottomWidth: 1,
    borderBottomColor: "#444c56", // Matching border color
    borderTopWidth: 1,
    borderTopColor: "#444c56", // Matching border color
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  batsmanText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#e0e0e0", // Light grey text
  },
  batsmanName: {
    fontWeight: "bold",
  },
  batsmanStats: {
    color: "#b0b0b0", // Slightly lighter grey for stats
  },
  bowlerText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#e0e0e0", // Light grey text
  },
  bowlerName: {
    fontWeight: "bold",
  },
  bowlerStats: {
    color: "#b0b0b0", // Slightly lighter grey for stats
  },
});
