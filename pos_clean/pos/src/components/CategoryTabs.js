
import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "./Colors";

export default function CategoryTabs({
  categories = [],
  activeCategoryId,
  onCategoryChange,
  onAddItem,
}) {
  return (
    <View style={styles.wrap} testID="category-tabs">

      {/* Scrollable category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.row}
      >
        {categories.map((c) => {
          const active = c.id === activeCategoryId;

          return (
            <Pressable
              key={c.id}
              onPress={() => onCategoryChange?.(c.id)}
              style={styles.tab}
              testID={`category-tab-${c.id}`}
            >
              <Text style={[styles.label, active && styles.labelActive]}>
                {c.name}
              </Text>

              <View
                style={[
                  styles.underline,
                  active && styles.underlineActive,
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Fixed Add Item button */}
      <Pressable
        onPress={onAddItem}
        style={styles.addItemButton}
        accessibilityRole="button"
        accessibilityLabel="Add item"
        testID="category-add-item"
      >
        <MaterialCommunityIcons
          name="plus-circle-outline"
          size={20}
          color={COLORS.blue}
        />
        <Text style={styles.addItemText}>Add Item</Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.md,
  },

  tabsScroll: {
    flex: 1,
    minWidth: 0,
  },

  row: {
    alignItems: "center",
    gap: SPACING.xl,
    paddingRight: SPACING.md,
  },

  tab: {
    flexShrink: 0,
    height: 44,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 6,
  },

  label: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  labelActive: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontWeight: "700",
  },

  underline: {
    height: 3,
    marginTop: 6,
    width: "100%",
    borderRadius: RADIUS.pill,
    backgroundColor: "transparent",
  },

  underlineActive: {
    backgroundColor: COLORS.blue,
  },

  addItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS.blue,
    borderRadius: RADIUS.pill,
    flexShrink: 0,
    backgroundColor: COLORS.bg,
  },

  addItemText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.blue,
  },
});
