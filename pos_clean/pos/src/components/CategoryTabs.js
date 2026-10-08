// src/components/CategoryTabs.js
import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { COLORS, SPACING, RADIUS } from "./Colors";

/**
 * Horizontal category tabs (chip row).
 * - Single horizontal scroller — chips never wrap.
 * - Active chip: bold text + blue underline (per reference).
 *
 * Props:
 *   categories: Array<{ id, name }>
 *   activeCategoryId: string
 *   onCategoryChange: (id) => void
 */
export default function CategoryTabs({
  categories = [],
  activeCategoryId,
  onCategoryChange,
}) {
  return (
    <View style={styles.wrap} testID="category-tabs">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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
                  active ? styles.underlineActive : null,
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 56,
    backgroundColor: COLORS.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
    justifyContent: "flex-end",
  },
  row: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xl,
    alignItems: "flex-end",
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
});
