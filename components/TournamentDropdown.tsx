import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Tournament } from "@/firebase/models/Tournament";
import { Timestamp } from "@react-native-firebase/firestore";
interface TournamentDropdownProps {
  selectedTournament: Tournament | undefined;
  onTournamentSelect: (tournament: Tournament) => void;
  isAllTournaments?: boolean;
}

const TournamentDropdown: React.FC<TournamentDropdownProps> = ({
  selectedTournament,
  onTournamentSelect,
  isAllTournaments = false,
}) => {
  const { currentTheme, currentTournament } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;
  const [showDropdown, setShowDropdown] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    const fetchTournaments = async () => {
      const tournamentList = await Tournament.getAll();
      if (isAllTournaments) {
        setTournaments([
          {
            id: "all",
            name: "All",
            date: Timestamp.now(),
            clubId: "",
            status: "upcoming",
          },
          ...tournamentList,
        ]);
      } else {
        setTournaments(tournamentList);
      }
      // Set the first tournament as default if none selected
      if (!selectedTournament && tournamentList && tournamentList.length > 0) {
        onTournamentSelect(
          tournamentList.find((t) => t.id === currentTournament) ||
            tournamentList[0]
        );
      }
    };
    fetchTournaments();
  }, []);

  return (
    <View style={themeStyles.dropdownContainer}>
      <TouchableOpacity
        style={themeStyles.dropdownButton}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text style={themeStyles.dropdownButtonText}>
          {selectedTournament?.name || "Select Tournament"}
        </Text>
        <Ionicons
          name={showDropdown ? "chevron-up" : "chevron-down"}
          size={24}
          color={currentTheme === "dark" ? "#4dabf5" : "#1a73e8"}
        />
      </TouchableOpacity>

      {showDropdown && (
        <View style={themeStyles.dropdownContent}>
          {tournaments.map((tournament) => (
            <TouchableOpacity
              key={tournament.id}
              style={themeStyles.dropdownItem}
              onPress={() => {
                onTournamentSelect(tournament);
                setShowDropdown(false);
              }}
            >
              <Text
                style={[
                  themeStyles.dropdownItemText,
                  selectedTournament?.id === tournament.id &&
                    themeStyles.selectedItemText,
                ]}
              >
                {tournament.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const darkStyles = StyleSheet.create({
  dropdownContainer: {
    width: "100%",
    marginBottom: 20,
    zIndex: 1,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2C2C2C",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  dropdownContent: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#2C2C2C",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A3A",
  },
  dropdownItemText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  selectedItemText: {
    color: "#4dabf5",
    fontWeight: "600",
  },
});

const lightStyles = StyleSheet.create({
  dropdownContainer: {
    width: "100%",
    marginBottom: 20,
    zIndex: 1,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownButtonText: {
    color: "#333333",
    fontSize: 16,
    fontWeight: "600",
  },
  dropdownContent: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  dropdownItemText: {
    color: "#333333",
    fontSize: 16,
  },
  selectedItemText: {
    color: "#1a73e8",
    fontWeight: "600",
  },
});

export default TournamentDropdown;
