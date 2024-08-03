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
      <View style={styles.batterContainer}>
        <View style={[styles.batter, styles.striker]}>
          <Text style={styles.batsmanName}>{strikerBatsman?.name}</Text>
          <Text style={styles.batsmanStats}>
            {batterStats?.runs} ({batterStats?.ballsFaced})
          </Text>
        </View>
        <View style={styles.batter}>
          <Text style={styles.batsmanName}>{nonStrikerBatsman?.name}</Text>
          <Text style={styles.batsmanStats}>
            {nonStrikerBatter?.runs} ({nonStrikerBatter?.ballsFaced})
          </Text>
        </View>
      </View>
      <View style={styles.bowlerContainer}>
        <Text style={styles.bowlerName}>{bowler?.name}</Text>
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
    backgroundColor: "#1e1e1e", // Darker background for modern look
    width: windowWidth,
    borderBottomWidth: 1,
    borderBottomColor: "#333", // Subtle border color
    borderTopWidth: 1,
    borderTopColor: "#333", // Subtle border color
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
    borderBottomColor: "#f39c12", // Highlight color for the striker
    paddingBottom: 5,
  },
  batsmanName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f5f5f5", // Lighter grey for better contrast
  },
  batsmanStats: {
    fontSize: 14,
    color: "#b0b0b0", // Slightly lighter grey for stats
  },
  bowlerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f5f5f5", // Lighter grey for better contrast
  },
  bowlerStats: {
    fontSize: 14,
    color: "#b0b0b0", // Slightly lighter grey for stats
  },
});
