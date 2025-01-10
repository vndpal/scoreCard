import { useTheme } from "@/context/ThemeContext";
import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";

// Define the props interface
interface TableProps<T> {
  columns: Array<{ key: string; label: string }>;
  data: T[];
  title?: string;
  tableStyle?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<TextStyle>;
  cellStyle?: StyleProp<TextStyle>;
}

// Utility function to estimate text width
const estimateTextWidth = (text: string, fontSize: number = 14): number => {
  return text.length * (fontSize * 0.6); // Approximation for text width
};

const Table = <T extends Record<string, any>>({
  columns,
  data,
  title,
  tableStyle,
  headerStyle,
  cellStyle,
}: TableProps<T>): JSX.Element => {
  const screenWidth = Dimensions.get("window").width;
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  // Calculate dynamic column widths
  const columnWidths = columns.map((col) => {
    const maxContentWidth = Math.max(
      ...data.map((row) => estimateTextWidth(String(row[col.key] || ""), 14)),
      estimateTextWidth(col.label, 14)
    );
    return maxContentWidth + 20; // Add padding
  });

  return (
    <ScrollView
      horizontal
      style={[styles.container, themeStyles.container, tableStyle]}
    >
      <View style={[styles.table, themeStyles.table]}>
        {/* Title Row - Only render if title exists */}
        {title && (
          <View style={[styles.titleContainer, themeStyles.titleContainer]}>
            <Text style={[styles.title, themeStyles.title]}>{title}</Text>
          </View>
        )}

        {/* Header Row */}
        <View style={[styles.row, themeStyles.row]}>
          {columns.map((col, index) => (
            <Text
              key={col.key as string}
              style={[
                styles.headerCell,
                themeStyles.headerCell,
                headerStyle,
                { width: columnWidths[index] },
              ]}
            >
              {col.label}
            </Text>
          ))}
        </View>

        {/* Data Rows */}
        {data.map((row, rowIndex) => (
          <View key={rowIndex} style={[styles.row, themeStyles.row]}>
            {columns.map((col, colIndex) => (
              <Text
                key={colIndex}
                style={[
                  styles.cell,
                  themeStyles.cell,
                  cellStyle,
                  { width: columnWidths[colIndex] },
                ]}
              >
                {row[col.key] ?? ""}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  table: {
    flexDirection: "column",
    width: "100%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  headerCell: {
    padding: 10,
    textAlign: "left",
    fontWeight: "bold",
    fontSize: 14,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    backgroundColor: "#64748b",
    color: "#ffffff",
  },
  cell: {
    padding: 10,
    textAlign: "left",
    fontSize: 14,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  titleContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    backgroundColor: "#475569",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0f172a",
  },
  table: {
    borderColor: "#334155",
  },
  row: {
    borderBottomColor: "#334155",
  },
  headerCell: {
    backgroundColor: "#1e293b",
    color: "#f8fafc",
    borderRightColor: "#334155",
  },
  cell: {
    backgroundColor: "#0f172a",
    color: "#cbd5e1",
    borderRightColor: "#334155",
  },
  titleContainer: {
    backgroundColor: "#1e293b",
    borderBottomColor: "#334155",
  },
  title: {
    color: "#f8fafc",
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
  },
  table: {
    borderColor: "#cbd5e1",
  },
  row: {
    borderBottomColor: "#cbd5e1",
  },
  headerCell: {
    backgroundColor: "#64748b",
    color: "#ffffff",
    borderRightColor: "#cbd5e1",
  },
  cell: {
    backgroundColor: "#ffffff",
    color: "#000000",
    borderRightColor: "#cbd5e1",
  },
  titleContainer: {
    backgroundColor: "#475569",
    borderBottomColor: "#cbd5e1",
  },
  title: {
    color: "#ffffff",
  },
});

export default Table;
