import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { player, PlayerRole } from "@/types/player";
import { ROLE_META, getPlayerRole } from "@/constants/playerRoles";

// Re-export for back-compat with existing imports of `PlayerRole`/`ROLE_META`
// from this module. New code should import from `@/constants/playerRoles`.
export { ROLE_META };
export type { PlayerRole };

type RoleFilter = "ALL" | PlayerRole;

interface PlayerPickerProps {
  visible: boolean;
  targetTeamName: string;
  targetTeamShort: string;
  targetTeamColor: string;
  pool: player[];
  onClose: () => void;
  onAdd: (playerIds: string[]) => void;
  onCreateNew: (name: string, role: PlayerRole) => Promise<void> | void;
}

const PlayerPicker: React.FC<PlayerPickerProps> = ({
  visible,
  targetTeamName,
  targetTeamShort,
  targetTeamColor,
  pool,
  onClose,
  onAdd,
  onCreateNew,
}) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<PlayerRole>("BAT");
  const [creating, setCreating] = useState(false);
  const newInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setQuery("");
      setRoleFilter("ALL");
      setSelected(new Set());
      setCreatingNew(false);
      setNewName("");
      setNewRole("BAT");
      setCreating(false);
    }
  }, [visible]);

  useEffect(() => {
    if (creatingNew) {
      setTimeout(() => newInputRef.current?.focus(), 50);
    }
  }, [creatingNew]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...pool]
      .filter((p) => {
        if (roleFilter !== "ALL" && getPlayerRole(p) !== roleFilter) return false;
        if (q && !p.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pool, query, roleFilter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (selected.size > 0) onAdd([...selected]);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      await onCreateNew(name, newRole);
      setCreatingNew(false);
      setNewName("");
      setNewRole("BAT");
    } finally {
      setCreating(false);
    }
  };

  const roles: RoleFilter[] = ["ALL", "BAT", "BOWL"];
  const ctaActive = selected.size > 0;

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={false}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color="#1A2421" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Add to {targetTeamName}
              </Text>
              <Text style={styles.headerMeta}>
                {pool.length} in pool · {selected.size} selected
              </Text>
            </View>
            <View
              style={[styles.teamBadge, { backgroundColor: targetTeamColor }]}
            >
              <Text style={styles.teamBadgeText}>{targetTeamShort}</Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color="#8A938F" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search players…"
              placeholderTextColor="#9AA39F"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="words"
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close" size={14} color="#8A938F" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterRow}>
            {roles.map((r) => {
              const active = roleFilter === r;
              const color = r === "ALL" ? "#1A2421" : ROLE_META[r].color;
              const label = r === "ALL" ? "All" : ROLE_META[r].label;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRoleFilter(r)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? color : "#fff",
                      borderColor: active ? color : "#EAEFED",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? "#fff" : color },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* List */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 12,
            paddingBottom: 110 + insets.bottom,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {creatingNew ? (
            <View style={[styles.newCard, { borderColor: targetTeamColor }]}>
              <Text style={[styles.newCardLabel, { color: targetTeamColor }]}>
                NEW PLAYER
              </Text>
              <TextInput
                ref={newInputRef}
                value={newName}
                onChangeText={setNewName}
                placeholder="Player name"
                placeholderTextColor="#9AA39F"
                style={styles.newCardInput}
                autoCapitalize="words"
              />
              <Text style={styles.sectionLabel}>ROLE</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["BAT", "BOWL"] as PlayerRole[]).map((r) => {
                  const meta = ROLE_META[r];
                  const active = newRole === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setNewRole(r)}
                      style={[
                        styles.rolePill,
                        {
                          backgroundColor: active ? `${meta.color}1A` : "#fff",
                          borderColor: active ? meta.color : "#EAEFED",
                        },
                      ]}
                    >
                      <Text
                        style={[styles.rolePillText, { color: meta.color }]}
                      >
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setCreatingNew(false);
                    setNewName("");
                  }}
                  style={[styles.smallButton, { backgroundColor: "#F4F7F6" }]}
                >
                  <Text style={[styles.smallButtonText, { color: "#1A2421" }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreate}
                  disabled={!newName.trim() || creating}
                  style={[
                    styles.smallButton,
                    {
                      backgroundColor: newName.trim()
                        ? targetTeamColor
                        : "#D0D5D3",
                    },
                  ]}
                >
                  <Text style={[styles.smallButtonText, { color: "#fff" }]}>
                    {creating ? "Adding…" : "Create & Add"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setCreatingNew(true)}
              style={styles.createPrompt}
            >
              <View
                style={[
                  styles.createIconWrap,
                  { backgroundColor: `${targetTeamColor}1A` },
                ]}
              >
                <Ionicons name="add" size={18} color={targetTeamColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.createPromptTitle}>Create new player</Text>
                <Text style={styles.createPromptSubtitle}>
                  Add someone not in the pool
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {filtered.map((p) => {
            const checked = selected.has(p.id);
            const role = getPlayerRole(p);
            const meta = ROLE_META[role];
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => toggle(p.id)}
                activeOpacity={0.7}
                style={[
                  styles.poolRow,
                  {
                    backgroundColor: checked ? `${targetTeamColor}0E` : "#fff",
                    borderColor: checked ? targetTeamColor : "#EAEFED",
                  },
                ]}
              >
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text style={styles.poolName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View
                    style={[
                      styles.roleChip,
                      { backgroundColor: `${meta.color}14` },
                    ]}
                  >
                    <Text style={[styles.roleChipText, { color: meta.color }]}>
                      {meta.short}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: checked
                        ? targetTeamColor
                        : "transparent",
                      borderColor: checked ? targetTeamColor : "#C9D3CF",
                    },
                  ]}
                >
                  {checked && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {filtered.length === 0 && !creatingNew && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No players match your filters.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[styles.cta, { paddingBottom: 12 + insets.bottom }]}>
          <Pressable
            onPress={handleAdd}
            disabled={!ctaActive}
            style={({ pressed }) => [
              styles.ctaButton,
              {
                backgroundColor: ctaActive ? targetTeamColor : "#E8ECEA",
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.ctaText,
                { color: ctaActive ? "#fff" : "#8A938F" },
              ]}
            >
              {selected.size === 0
                ? "Select players to add"
                : `Add ${selected.size} player${selected.size > 1 ? "s" : ""} to ${targetTeamName}`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEFED",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F4F7F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2421",
  },
  headerMeta: {
    fontSize: 11,
    color: "#6B7571",
    marginTop: 1,
  },
  teamBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  teamBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  searchRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F4F7F6",
    borderWidth: 1,
    borderColor: "#EAEFED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1A2421",
    paddingVertical: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  createPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#C9D3CF",
    borderRadius: 12,
  },
  createIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  createPromptTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A2421",
  },
  createPromptSubtitle: {
    fontSize: 11,
    color: "#6B7571",
    marginTop: 1,
  },
  newCard: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  newCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  newCardInput: {
    borderWidth: 1,
    borderColor: "#EAEFED",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1A2421",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8A938F",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  rolePill: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  smallButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  smallButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  poolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  poolName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A2421",
    flexShrink: 1,
  },
  roleChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  roleChipText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#8A938F",
  },
  cta: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EAEFED",
    padding: 12,
  },
  ctaButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "700",
  },
});

export default PlayerPicker;
