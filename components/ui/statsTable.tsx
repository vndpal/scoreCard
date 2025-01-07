import React from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface StatsTableProps {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export const StatsTable: React.FC<StatsTableProps> = ({
  title,
  headers,
  rows,
}) => {
  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  return (
    <View style={[styles.table, themeStyles.table]}>
      <Text style={[styles.tableTitle, themeStyles.tableTitle]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tableContent}>
          <View style={styles.tableGrid}>
            {headers.map((header, index) => (
              <View key={index} style={styles.column}>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  {header}
                </Text>
              </View>
            ))}
          </View>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.tableGrid}>
              {row.map((cell, cellIndex) => (
                <View key={cellIndex} style={styles.column}>
                  <Text style={[styles.cell, themeStyles.cell]}>{cell}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  table: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: "700",
    padding: 8,
    letterSpacing: 0.5,
    textAlign: "center",
    borderBottomWidth: 2,
  },
  tableContent: {
    flexDirection: "column",
  },
  tableGrid: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  column: {
    minWidth: 60,
  },
  headerCell: {
    padding: 6,
    paddingHorizontal: 4,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 13,
    borderBottomWidth: 2,
  },
  cell: {
    padding: 6,
    paddingHorizontal: 4,
    textAlign: "center",
    fontSize: 13,
  },
});

const darkStyles = StyleSheet.create({
  table: {
    backgroundColor: "#1E1E1E",
  },
  tableTitle: {
    color: "#ffffff",
    backgroundColor: "#252525",
    borderBottomColor: "#404040",
  },
  headerCell: {
    color: "#E5E7EB",
    backgroundColor: "#252525",
    borderBottomColor: "#404040",
  },
  cell: {
    color: "#E5E7EB",
  },
});

const lightStyles = StyleSheet.create({
  table: {
    backgroundColor: "#ffffff",
  },
  tableTitle: {
    color: "#111827",
    backgroundColor: "#F8FAFC",
    borderBottomColor: "#E2E8F0",
  },
  headerCell: {
    color: "#334155",
    backgroundColor: "#F8FAFC",
    borderBottomColor: "#E2E8F0",
  },
  cell: {
    color: "#334155",
  },
});

export default StatsTable;
