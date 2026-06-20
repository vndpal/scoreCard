import { useAppContext } from "@/context/AppContext";
import { Player } from "@/firebase/models/Player";
import { player, PlayerRole } from "@/types/player";
import { ROLE_META, getPlayerRole } from "@/constants/playerRoles";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FAB } from "react-native-paper";

type RoleFilter = "ALL" | PlayerRole;

const lightPalette = {
  bg: "#F7F9F8",
  card: "#fff",
  ink: "#1A2421",
  muted: "#6B7571",
  subtle: "#8A938F",
  border: "#EAEFED",
  field: "#F4F7F6",
  placeholder: "#9AA39F",
  chipInk: "#1A2421",
};

const darkPalette = {
  bg: "#0F172A",
  card: "#1E293B",
  ink: "#F1F5F9",
  muted: "#94A3B8",
  subtle: "#94A3B8",
  border: "#334155",
  field: "#1E293B",
  placeholder: "#64748B",
  chipInk: "#F1F5F9",
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Players = () => {
  const router = useRouter();
  const [players, setPlayers] = useState<player[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const { currentTheme, club } = useAppContext();
  const isDark = currentTheme === "dark";
  const C = isDark ? darkPalette : lightPalette;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const playersFromDB: player[] = await Player.getAllFromClub(club.id);
      if (playersFromDB) {
        playersFromDB.sort((a, b) => a.name.localeCompare(b.name));
        setPlayers(playersFromDB);
      }
    })();
  }, []);

  const counts = useMemo(() => {
    let bat = 0;
    let bowl = 0;
    for (const p of players) {
      if (getPlayerRole(p) === "BOWL") bowl++;
      else bat++;
    }
    return { ALL: players.length, BAT: bat, BOWL: bowl };
  }, [players]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter((p) => {
      if (roleFilter !== "ALL" && getPlayerRole(p) !== roleFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [players, query, roleFilter]);

  const roles: RoleFilter[] = ["ALL", "BAT", "BOWL"];

  const renderItem = ({ item }: { item: player }) => {
    const role = getPlayerRole(item);
    const meta = ROLE_META[role];
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.row, { backgroundColor: C.card, borderColor: C.border }]}
        onPress={() =>
          router.push({
            pathname: "/player/[id]",
            params: { id: item.id, playerName: item.name },
          })
        }
      >
        <View style={[styles.avatar, { backgroundColor: `${meta.color}1A` }]}>
          <Text style={[styles.avatarText, { color: meta.color }]}>
            {getInitials(item.name)}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: C.ink }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.roleLine}>
            <View
              style={[styles.roleDot, { backgroundColor: meta.color }]}
            />
            <Text style={[styles.roleText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.subtle} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={styles.header}>
        <View
          style={[
            styles.searchRow,
            { backgroundColor: C.field, borderColor: C.border },
          ]}
        >
          <Ionicons name="search" size={16} color={C.subtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search players…"
            placeholderTextColor={C.placeholder}
            style={[styles.searchInput, { color: C.ink }]}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close" size={14} color={C.subtle} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {roles.map((r) => {
            const active = roleFilter === r;
            const color = r === "ALL" ? C.chipInk : ROLE_META[r].color;
            const label = r === "ALL" ? "All" : ROLE_META[r].label;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRoleFilter(r)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? color : C.card,
                    borderColor: active ? color : C.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? (isDark ? "#0F172A" : "#fff") : color },
                  ]}
                >
                  {label}
                </Text>
                <View
                  style={[
                    styles.countPill,
                    {
                      backgroundColor: active
                        ? "rgba(255,255,255,0.22)"
                        : C.field,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countPillText,
                      { color: active ? (isDark ? "#0F172A" : "#fff") : color },
                    ]}
                  >
                    {counts[r]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 12,
          paddingBottom: 90 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={query || roleFilter !== "ALL" ? "search" : "people-outline"}
              size={32}
              color={C.subtle}
            />
            <Text style={[styles.emptyText, { color: C.muted }]}>
              {query || roleFilter !== "ALL"
                ? "No players match your filters."
                : "No players yet. Tap + to add one."}
            </Text>
          </View>
        }
      />

      <FAB
        style={[
          styles.fab,
          { backgroundColor: "#0c66e4", bottom: insets.bottom + 16 },
        ]}
        color="#fff"
        small
        icon="plus"
        onPress={() => router.push("/createPlayer")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  countPill: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    alignItems: "center",
  },
  countPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  roleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  roleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default Players;
