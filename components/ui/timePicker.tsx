import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import ScrollPicker from "react-native-wheel-scrollview-picker";
import { useAppContext } from "@/context/AppContext";

interface TimePickerProps {
  initialHour?: number;
  initialMinute?: number;
  initialSecond?: number;
  onTimeChange: (hour: number, minute: number, second: number) => void;
  onCancel: () => void;
}

const TimePicker: React.FC<TimePickerProps> = ({
  initialHour = 0,
  initialMinute = 0,
  initialSecond = 0,
  onTimeChange,
  onCancel,
}) => {
  const { currentTheme } = useAppContext();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  const [selectedHour, setSelectedHour] = useState(initialHour);
  const [selectedMinute, setSelectedMinute] = useState(initialMinute);
  const [selectedSecond, setSelectedSecond] = useState(initialSecond);

  const timeData = {
    hours: Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")),
    minutes: Array.from({ length: 60 }, (_, i) =>
      i.toString().padStart(2, "0")
    ),
    seconds: Array.from({ length: 60 }, (_, i) =>
      i.toString().padStart(2, "0")
    ),
  };

  const renderScrollPicker = (
    dataSource: string[],
    selectedIndex: number,
    onValueChange: (index: number) => void
  ) => (
    <ScrollPicker
      dataSource={dataSource}
      selectedIndex={selectedIndex}
      renderItem={(data, _, isSelected) => (
        <Text
          style={[
            themeStyles.pickerItem,
            isSelected && themeStyles.selectedItem,
          ]}
        >
          {data}
        </Text>
      )}
      onValueChange={(_, index) => onValueChange(index)}
      wrapperHeight={120}
      wrapperBackground={themeStyles.pickerBackground.backgroundColor}
      itemHeight={40}
      highlightColor={themeStyles.highlightColor.backgroundColor}
      highlightBorderWidth={1}
    />
  );

  return (
    <View style={themeStyles.overlay}>
      <View style={themeStyles.container}>
        <View style={themeStyles.pickerContainer}>
          {renderScrollPicker(timeData.hours, selectedHour, setSelectedHour)}
          <Text style={themeStyles.separator}>:</Text>
          {renderScrollPicker(
            timeData.minutes,
            selectedMinute,
            setSelectedMinute
          )}
          <Text style={themeStyles.separator}>:</Text>
          {renderScrollPicker(
            timeData.seconds,
            selectedSecond,
            setSelectedSecond
          )}
        </View>
        <View style={themeStyles.buttonContainer}>
          <TouchableOpacity style={themeStyles.button} onPress={onCancel}>
            <Text style={themeStyles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[themeStyles.button, themeStyles.confirmButton]}
            onPress={() =>
              onTimeChange(selectedHour, selectedMinute, selectedSecond)
            }
          >
            <Text
              style={[themeStyles.buttonText, themeStyles.confirmButtonText]}
            >
              Confirm
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const lightStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    width: "80%",
  },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerItem: {
    fontSize: 22,
    color: "#333",
  },
  selectedItem: {
    color: "#007AFF",
    fontWeight: "bold",
  },
  separator: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  buttonText: {
    fontSize: 16,
    color: "#007AFF",
  },
  confirmButton: {
    backgroundColor: "#007AFF",
  },
  confirmButtonText: {
    color: "#FFFFFF",
  },
  pickerBackground: {
    backgroundColor: "#FFFFFF",
  },
  highlightColor: {
    backgroundColor: "#E0E0E0",
  },
});

const darkStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  container: {
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    padding: 20,
    width: "80%",
  },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerItem: {
    fontSize: 22,
    color: "#E0E0E0",
  },
  selectedItem: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  separator: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#E0E0E0",
    marginHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  buttonText: {
    fontSize: 16,
    color: "#4CAF50",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
  },
  confirmButtonText: {
    color: "#FFFFFF",
  },
  pickerBackground: {
    backgroundColor: "#2C2C2C",
  },
  highlightColor: {
    backgroundColor: "#3C3C3C",
  },
});

export default TimePicker;
