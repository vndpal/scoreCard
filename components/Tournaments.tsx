import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useAppContext } from "@/context/AppContext";
import { Tournament } from "@/firebase/models/Tournament";
import { useEffect } from "react";
import { useState } from "react";
import { CreateTournament } from "./forms/CreateTournament";
import { Ionicons } from "@expo/vector-icons";

const Tournaments = () => {
  const { currentTheme, club } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    const fetchTournaments = async () => {
      const tournaments = await Tournament.getAllByClubId(club.id);
      tournaments.sort((a, b) => {
        const dateA = a.date.toDate();
        const dateB = b.date.toDate();
        return dateB.getTime() - dateA.getTime();
      });
      setTournaments(tournaments);
    };
    fetchTournaments();
  }, []);

  const formatDate = (timestamp: any) => {
    return new Date(timestamp.toDate()).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: "upcoming" | "ongoing" | "completed") => {
    switch (status) {
      case "upcoming":
        return currentTheme === "dark" ? "#1B5E20" : "#4CAF50";
      case "ongoing":
        return currentTheme === "dark" ? "#0D47A1" : "#2196F3";
      case "completed":
        return currentTheme === "dark" ? "#B71C1C" : "#F44336";
    }
  };

  return (
    <View style={[styles.container, themeStyles.container]}>
      <CreateTournament style={styles.formContainer} />

      <View style={styles.scrollWrapper}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {tournaments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="trophy-outline"
                size={48}
                color={currentTheme === "dark" ? "#666" : "#999"}
              />
              <Text style={[styles.emptyStateText, themeStyles.subText]}>
                No tournaments yet. Create your first tournament!
              </Text>
            </View>
          ) : (
            tournaments.map((tournament) => (
              <Pressable
                key={tournament.id}
                style={[styles.card, themeStyles.card]}
                android_ripple={{
                  color: currentTheme === "dark" ? "#333" : "#f0f0f0",
                }}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.tournamentName, themeStyles.text]}>
                    {tournament.name}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(tournament.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{tournament.status}</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.infoRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={currentTheme === "dark" ? "#999" : "#666"}
                    />
                    <Text style={[styles.infoText, themeStyles.subText]}>
                      {formatDate(tournament.date)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default Tournaments;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 0,
  },
  card: {
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 12,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
    color: "#FFFFFF",
  },
  cardContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
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
});
