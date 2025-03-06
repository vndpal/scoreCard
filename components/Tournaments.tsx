import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { Tournament } from "@/firebase/models/Tournament";
import { useEffect } from "react";
import { useState } from "react";
import { CreateTournament } from "./forms/CreateTournament";
const Tournaments = () => {
  const { currentTheme, club } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    const fetchTournaments = async () => {
      const tournaments = await Tournament.getAllByClubId(club.id);
      setTournaments(tournaments);
    };
    fetchTournaments();
  }, []);

  return (
    <View style={[styles.container, themeStyles.container]}>
      <CreateTournament style={styles.formContainer} />
      <View style={styles.scrollWrapper}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {tournaments.map((tournament) => (
            <Pressable
              key={tournament.id}
              style={[styles.card, themeStyles.card]}
            >
              <Text style={[styles.tournamentName, themeStyles.text]}>
                {tournament.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

export default Tournaments;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  formContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  scrollWrapper: {
    flex: 1,
    minHeight: 100,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 0,
  },
  card: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
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
});
