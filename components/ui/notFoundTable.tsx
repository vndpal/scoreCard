import { View, Text, StyleSheet } from "react-native";

const NotFoundTable = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>No Records Found! 🏏</Text>
      <Text style={styles.subMessage}>
        Nothing to show here! 🎯 Try refining your search criteria ✨
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    marginVertical: 20,
    minHeight: 120,
  },
  message: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subMessage: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    letterSpacing: -0.2,
    lineHeight: 22,
  },
});

export default NotFoundTable;
