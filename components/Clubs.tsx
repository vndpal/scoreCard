import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
  Keyboard,
  KeyboardEvent,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { Club } from "@/firebase/models/Club";
import { getUniqueClubName } from "@/utils/getUniqueClubName";

export default function ClubsScreen() {
  const [clubName, setClubName] = useState("");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleContinueWithClub = async () => {
    if (clubName.trim()) {
      const isClubExists = await Club.isClubExists(clubName.trim());
      if (!isClubExists) {
        await Club.create(clubName.trim());
      }
      await AsyncStorage.setItem("userClub", clubName.trim());
      router.replace("/");
    }
  };

  const handleContinueAsGuest = async () => {
    const randomClubName = await getUniqueClubName();
    await Club.create(randomClubName);
    await AsyncStorage.setItem("userClub", randomClubName);
    router.replace("/");
  };

  return (
    <View
      style={[
        styles.container,
        { marginTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
      ]}
    >
      <>
        {!isKeyboardVisible && (
          <Text style={styles.title}>Welcome to ScoreCard!</Text>
        )}

        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </>

      <View style={styles.bottomContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Create or join club"
            value={clubName}
            onChangeText={setClubName}
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.continueButton]}
            onPress={handleContinueWithClub}
          >
            <Text style={styles.buttonText}>Join the club</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.guestButton]}
            onPress={handleContinueAsGuest}
          >
            <Text style={[styles.buttonText, styles.guestButtonText]}>
              Continue as guest
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    color: Colors.light.tint,
    letterSpacing: 1.5,
    marginTop: 40,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif-light",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#f8f8f8",
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  continueButton: {
    backgroundColor: Colors.light.tint,
  },
  guestButton: {
    backgroundColor: "transparent",
    paddingVertical: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  guestButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "400",
  },
  logoContainer: {
    flex: 1,
    marginBottom: 135,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 300,
    height: 300,
  },
});
