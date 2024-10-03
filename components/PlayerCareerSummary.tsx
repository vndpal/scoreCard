import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { playerCareerStats } from "@/types/playerCareerStats";
import { player } from "@/types/player";
import { getItem } from "@/utils/asyncStorage";
import { STORAGE_ITEMS } from "@/constants/StorageItems";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Icon } from "react-native-paper";
import Loader from "./Loader";

const PlayerCareerSummary = () => {
  const [battingStats, setBattingStats] = useState<playerCareerStats[]>([]);
  const [bowlingStats, setBowlingStats] = useState<playerCareerStats[]>([]);
  const [playersMap, setPlayersMap] = useState<Map<string, string>>(new Map());
  const [webViewContent, setWebViewContent] = useState<string | null>(null);
  const [isLoader, setIsLoader] = useState<boolean>(false);

  const { currentTheme } = useTheme();
  const themeStyles = currentTheme === "dark" ? darkStyles : lightStyles;

  useEffect(() => {
    (async () => {
      const careerStats = await getItem(STORAGE_ITEMS.PLAYER_CAREER_STATS);
      const players = await getItem(STORAGE_ITEMS.PLAYERS);
      if (careerStats && players) {
        const playersMap = new Map<string, string>();
        players.forEach((p: player) => {
          playersMap.set(p.id.toString(), p.name);
        });
        setPlayersMap(playersMap);
        // Sort battingStats by most runs and then by best strike rate
        const sortedBattingStats = [...careerStats].sort(
          (a: playerCareerStats, b: playerCareerStats) => {
            if (b.runs !== a.runs) {
              return b.runs - a.runs;
            }
            return b.strikeRate - a.strikeRate;
          }
        );

        // Sort bowlingStats by most wickets and then by best bowling economy
        const sortedBowlingStats = [...careerStats].sort(
          (a: playerCareerStats, b: playerCareerStats) => {
            if (b.wickets !== a.wickets) {
              return b.wickets - a.wickets;
            }
            return a.bowlingEconomy - b.bowlingEconomy;
          }
        );

        setBattingStats(sortedBattingStats);
        setBowlingStats(sortedBowlingStats);
      }
    })();
  }, []);

  const webViewRef = useRef<WebView>(null);

  const exportAsImage = () => {
    setIsLoader(true);
    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: ${
                currentTheme === "dark" ? "#121212" : "#e8f5e9"
              };
              color: ${currentTheme === "dark" ? "#e0f2f1" : "#333333"};
            }

            .container {
              width: 1200px;
              padding: 20px;
              background-color:  ${
                currentTheme === "dark" ? "#1e1e1e" : "#ffffff"
              };
            border: 1px solid ${
              currentTheme === "dark" ? "#333333" : "#cfd8dc"
            };
            box-shadow: 0 6px 12px ${
              currentTheme === "dark"
                ? "rgba(0, 0, 0, 0.7)"
                : "rgba(0, 0, 0, 0.1)"
            };
          }

          h1 {
            text-align: center;
            color: ${currentTheme === "dark" ? "#00bfae" : "#004d40"};
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 1px solid ${
              currentTheme === "dark" ? "#333333" : "#cfd8dc"
            };
          }

          th,
          td {
            border: 1px solid ${
              currentTheme === "dark" ? "#999999" : "#b0bec5"
            };
            padding: 12px;
            text-align: left;
          }

          th {
            background-color: ${
              currentTheme === "dark" ? "#00bfae" : "#004d40"
            };
            color: ${currentTheme === "dark" ? "#121212" : "#ffffff"};
          }

          tr:nth-child(even) {
              background-color: ${
                currentTheme === "dark" ? "#333333" : "#e0f2f1"
              };
            }
          }
        </style>  
        </head>
        <body>
          <div class="container">
            <h1>Player Stats</h1>
            
            <h2>Batting Records</h2>
            <table>
              <tr>
                <th>Player</th>
                <th>Runs</th>
                <th>Balls</th>
                <th>Sixes</th>
                <th>Fours</th>
                <th>SR</th>
                <th>Avg</th>
                <th>Innings</th>
                <th>Matches</th>
              </tr>
              ${battingStats
                .slice(0, 30)
                .map(
                  (player) => `
                <tr>
                  <td>${playersMap.get(player.playerId) || player.playerId}</td>
                  <td>${player.runs}</td>
                  <td>${player.ballsFaced}</td>
                  <td>${player.sixes}</td>
                  <td>${player.fours}</td>
                  <td>${
                    player.strikeRate ? player.strikeRate.toFixed(2) : "-"
                  }</td>
                  <td>${player.average ? player.average.toFixed(2) : "-"}</td>
                  <td>${player.innings}</td>
                  <td>${player.matches}</td>
                </tr>
              `
                )
                .join("")}
            </table>

            <h2>Bowling Records</h2>
            <table>
              <tr>
                <th>Player</th>
                <th>Overs</th>
                <th>Runs</th>
                <th>Wickets</th>
                <th>Eco</th>
                <th>Extras</th>
                <th>6s</th>
                <th>4s</th>
                <th>Matches</th>
              </tr>
              ${bowlingStats
                .slice(0, 30)
                .map(
                  (player) => `
                <tr>
                  <td>${playersMap.get(player.playerId) || player.playerId}</td>
                  <td>${player.overs}${
                    player.ballsBowled > 0 ? "." + player.ballsBowled : ""
                  }</td>
                  <td>${player.runsConceded}</td>
                  <td>${player.wickets}</td>
                  <td>${
                    player.bowlingEconomy
                      ? player.bowlingEconomy.toFixed(2)
                      : "-"
                  }</td>
                  <td>${player.extras}</td>
                  <td>${player.sixesConceded}</td>
                  <td>${player.foursConceded}</td>
                  <td>${player.matches}</td>
                </tr>
              `
                )
                .join("")}
            </table>
          </div>
          <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
          <script>
            const content = document.querySelector('.container');
            const sendImage = () => {
              html2canvas(content, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                logging: false,
                width: content.offsetWidth,
                height: content.offsetHeight
              }).then(canvas => {
                const imageData = canvas.toDataURL('image/png', 1.0);
                window.ReactNativeWebView.postMessage(imageData);
              });
            };
            // Wait for fonts and images to load
            window.onload = () => {
              setTimeout(sendImage, 500);
            };
          </script>
        </body>
      </html>
    `;

    setWebViewContent(htmlContent);
  };

  const handleMessage = async (event: WebViewMessageEvent) => {
    const base64Data = event.nativeEvent.data.split(",")[1];
    const fileName = `player_career_summary_${Date.now()}.png`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    try {
      await FileSystem.writeAsStringAsync(filePath, base64Data, {
        encoding: "base64",
      });
      console.log("Image saved:", filePath);
      //test

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
      } else {
        console.log("Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error saving or sharing image:", error);
    }
    setIsLoader(false);
    setWebViewContent(null); // Reset WebView content after handling
  };

  const renderItem = ({
    item,
    type,
  }: {
    item: playerCareerStats;
    type: string;
  }) => (
    <View style={[styles.row, themeStyles.row]} key={item.playerId}>
      <Text
        style={[styles.nameCell, themeStyles.nameCell]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {playersMap.get(item.playerId) || item.playerId}
      </Text>
      {type === "batting" ? (
        <>
          <Text style={[styles.cell, themeStyles.cell]}>{item.runs}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.ballsFaced}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.sixes}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.fours}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.strikeRate ? item.strikeRate.toFixed(2) : "-"}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.average ? item.average.toFixed(2) : "-"}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.innings}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.matches}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.overs}
            {item.ballsBowled > 0 ? "." + item.ballsBowled : ""}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.runsConceded}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.wickets}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.bowlingEconomy ? item.bowlingEconomy.toFixed(2) : "-"}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.extras}</Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.sixesConceded}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>
            {item.foursConceded}
          </Text>
          <Text style={[styles.cell, themeStyles.cell]}>{item.matches}</Text>
        </>
      )}
    </View>
  );

  const renderTable = (
    title: string,
    data: playerCareerStats[],
    type: string,
    id: string
  ) => (
    <View key={id} style={[styles.table, themeStyles.table]}>
      <LinearGradient
        colors={
          currentTheme === "dark"
            ? ["#2c3e50", "#34495e"]
            : ["#ecf0f1", "#bdc3c7"]
        }
        style={styles.tableHeader}
      >
        <Text style={[styles.tableTitle, themeStyles.tableTitle]}>{title}</Text>
      </LinearGradient>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tableContent}>
          <View style={[styles.headerRow, themeStyles.headerRow]}>
            <Text style={[styles.headerCell, themeStyles.headerCell]}>
              Player
            </Text>
            {type === "batting" ? (
              <>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Runs
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Balls
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Sixes
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Fours
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  SR
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Avg
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Innings
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Matches
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Overs
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Runs
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Wickets
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Eco
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Extras
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  6s
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  4s
                </Text>
                <Text style={[styles.headerCell, themeStyles.headerCell]}>
                  Matches
                </Text>
              </>
            )}
          </View>
          {data.map((item) => renderItem({ item, type }))}
        </View>
      </ScrollView>
    </View>
  );

  const data = [
    {
      id: "1",
      title: "Batting Records",
      data: battingStats,
      type: "batting",
    },
    {
      id: "2",
      title: "Bowling Records",
      data: bowlingStats,
      type: "bowling",
    },
  ];

  return (
    <View style={[styles.container, themeStyles.container]}>
      <ScrollView style={styles.content}>
        {data.map((item) =>
          renderTable(item.title, item.data, item.type, item.id)
        )}
      </ScrollView>
      <View style={[styles.footer, themeStyles.footer]}>
        <TouchableOpacity
          onPress={exportAsImage}
          style={[styles.shareButton, themeStyles.shareButton]}
        >
          <Text style={[styles.shareButtonText, themeStyles.shareButtonText]}>
            <Icon source="share" size={20} color="white" /> Share
          </Text>
        </TouchableOpacity>
      </View>
      {webViewContent && (
        <WebView
          source={{ html: webViewContent }}
          style={{ height: 1, width: 1 }}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          originWhitelist={["*"]}
        />
      )}
      {isLoader && <Loader />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  footer: {
    padding: 8,
    borderTopWidth: 1,
  },
  shareButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: "100%",
    alignSelf: "center",
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  table: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    padding: 16,
  },
  tableTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  tableContent: {
    flexDirection: "column",
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    flex: 1,
    fontWeight: "600",
    textAlign: "center",
    fontSize: 14,
    minWidth: 70,
  },
  cell: {
    flex: 1,
    textAlign: "center",
    padding: 8,
    fontSize: 14,
    minWidth: 70,
  },
  nameCell: {
    flex: 1.5,
    textAlign: "left",
    padding: 8,
    fontSize: 14,
    minWidth: 100,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#121212",
  },
  footer: {
    backgroundColor: "#1E1E1E",
    borderTopColor: "#333",
  },
  shareButton: {
    backgroundColor: "#3498db",
  },
  shareButtonText: {
    color: "#FFFFFF",
  },
  table: {
    backgroundColor: "#1f1f1f",
  },
  tableTitle: {
    color: "#ffffff",
  },
  headerRow: {
    backgroundColor: "#2c3e50",
  },
  headerCell: {
    color: "#ecf0f1",
  },
  cell: {
    color: "#ffffff",
  },
  nameCell: {
    color: "#3498db",
  },
  row: {
    borderBottomColor: "#2c3e50",
    borderBottomWidth: 1,
  },
});

const lightStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
  },
  footer: {
    backgroundColor: "#F8F8F8",
    borderTopColor: "#E0E0E0",
  },
  shareButton: {
    backgroundColor: "#3498db",
  },
  shareButtonText: {
    color: "#FFFFFF",
  },
  table: {
    backgroundColor: "#ffffff",
  },
  tableTitle: {
    color: "#2c3e50",
  },
  headerRow: {
    backgroundColor: "#ecf0f1",
  },
  headerCell: {
    color: "#2c3e50",
  },
  cell: {
    color: "#34495e",
  },
  nameCell: {
    color: "#2980b9",
  },
  row: {
    borderBottomColor: "#ecf0f1",
    borderBottomWidth: 1,
  },
});

export default PlayerCareerSummary;
