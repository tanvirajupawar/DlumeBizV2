// src/components/CustomerSearchScreen.js

import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS } from "../../components/Colors";
import HeaderButton from "../../components/HeaderButton";

const MAX_CONTENT_WIDTH = 720;

/**
 * "Select Customer" screen.
 *
 * Header:
 * - Close button
 * - Select Customer title
 * - Add button
 *
 * Body:
 * - Search bar
 * - Customer list
 *
 * Props:
 *  - customers: [{ id, name, phone }]
 *  - searchValue, onSearchChange
 *  - onClose        () => void
 *  - onSelectCustomer(customer) => void
 *  - onAddNew       () => void
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
    <SafeAreaView
      style={styles.safe}
      edges={["top", "bottom"]}
      testID="customer-search-safe-area"
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={styles.headerIconBtn}
          testID="customer-search-close-button"
        >
          <Ionicons
            name="close"
            size={26}
            color={COLORS.textOnDark}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Select Customer
        </Text>

        <HeaderButton
          title="Add"
          onPress={onAddNew}
          testID="customer-search-add-button"
        />
      </View>

      {/* Centered body */}
     {/* Full body */}
<View style={styles.body}>
  {/* Centered form/content */}
  <View style={styles.centerCol}>
        {/* Search bar */}
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

        {/* Customer list */}
             <FlatList
          data={customers}
          keyExtractor={(item) => String(item.id || item._id)}
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
          renderItem={({ item }) => (
      <Pressable
  onPress={() => onSelectCustomer?.(item)}
  style={styles.row}
>
  <View style={styles.customerInfo}>
    <Text
      style={styles.customerName}
      numberOfLines={1}
    >
      {item.name}
    </Text>

    {!!item.company_name && (
      <Text
        style={styles.customerCompany}
        numberOfLines={1}
      >
        {item.company_name}
      </Text>
    )}
  </View>

  <Text
    style={styles.customerPhone}
    numberOfLines={1}
  >
    {item.phone}
  </Text>
</Pressable>
          )}
        />
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
safe: {
  flex: 1,
  backgroundColor: COLORS.navyDeep,
},

  // ── Header ──
  header: {
    height: 64,
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
    flex: 1,
    color: COLORS.textOnDark,
    fontSize: 19,
    fontWeight: "700",
  },

  // ── Body ──
// ── Body ──
body: {
  flex: 1,
  width: "100%",
  backgroundColor: COLORS.card,
},

centerCol: {
  flex: 1,
  width: "100%",
  maxWidth: MAX_CONTENT_WIDTH,
  alignSelf: "center",
  backgroundColor: COLORS.card,
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
  customerInfo: {
  flex: 1,
  minWidth: 0,
  marginRight: SPACING.md,
},

customerCompany: {
  fontSize: 17,
  color: COLORS.textMuted,
  marginTop: 3,
},
customerInfo: {
  flex: 1,
  minWidth: 0,
  marginRight: SPACING.md,
},

customerCompany: {
  fontSize: 17,
  color: COLORS.textMuted,
  marginTop: 3,
},
});