// src/components/CustomerSearchScreen.js
import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOW } from "../../components/Colors";

const MAX_CONTENT_WIDTH = 720;

/**
 * "Select Customer" screen.
 * Wrapped in a SafeAreaView (matching ManageCartItemModal). Dark-navy
 * header spans full width; the search bar + list are centered in a
 * max-width column so they don't stretch edge-to-edge on wide/tablet
 * screens. A floating "+" button in the bottom-right opens the
 * Add/Edit Customer form for a brand new customer.
 *
 * Props:
 *  - customers: [{ id, name, phone }]
 *  - searchValue, onSearchChange
 *  - onClose        () => void        — X button
 *  - onSelectCustomer(customer) => void — tapping a row
 *  - onAddNew       () => void        — the floating + button
 */
export default function CustomerSearchScreen({
  customers = [],
  searchValue,
  onSearchChange,
  onClose,
  onSelectCustomer,
  onAddNew,
}) {
  return (
    <SafeAreaView style={styles.safe} testID="customer-search-safe-area">
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={styles.headerIconBtn}
          testID="customer-search-close-button"
        >
          <Ionicons name="close" size={26} color={COLORS.textOnDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Select Customer</Text>
      </View>

      {/* Centered body: search bar + list */}
      <View style={styles.centerCol}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder="Search customers"
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
            testID="customer-search-input"
          />
        </View>

        <FlatList
          data={customers}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectCustomer?.(item)}
              style={styles.row}
            >
              <Text style={styles.customerName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.customerPhone} numberOfLines={1}>
                {item.phone}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Floating add button */}
      <Pressable
        onPress={onAddNew}
        style={styles.fab}
        testID="customer-search-add-button"
      >
        <Ionicons name="add" size={28} color={COLORS.textOnDark} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.card,
  },

  // ── Header ──
  header: {
    height: 72,
    paddingTop: 8,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  headerTitle: {
    color: COLORS.textOnDark,
    fontSize: 22,
    fontWeight: "700",
  },

  /* centers the search bar + list in a max-width column, like
     ManageCartItemModal's centerCol */
  centerCol: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },

  // ── Search bar ──
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 20,
    color: COLORS.textPrimary,
    padding: 0,
  },

  // ── List ──
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.divider,
    marginLeft: SPACING.lg,
  },
  customerName: {
    fontSize: 22,
    color: COLORS.blue,
    flexShrink: 1,
    marginRight: SPACING.md,
  },
  customerPhone: {
    fontSize: 19,
    color: COLORS.blue,
  },

  // ── Floating add button ──
fab: {
  position: "absolute",
  right: SPACING.xl,
  bottom: 48, 
  width: 56,
  height: 56,
  borderRadius: RADIUS.pill,
  backgroundColor: COLORS.blue,
  alignItems: "center",
  justifyContent: "center",
  ...SHADOW.card,
},
});