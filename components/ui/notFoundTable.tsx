import { View, Text, StyleSheet } from "react-native";

const NotFoundTable = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>No Records Found 🏏</Text>
      <Text style={styles.subMessage}>Clean bowled! Try another search</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#f0f8ff", // Light cricket-field blue
    borderWidth: 1,
    borderColor: "#add8e6",
    marginVertical: 16,
    minHeight: 100,
  },
  message: {
    fontSize: 20,
    fontWeight: "700", // Made bolder
    color: "#1a5f7a", // Darker blue for better visibility
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 15,
    color: "#4682b4",
    textAlign: "center",
  },
});

export default NotFoundTable;
