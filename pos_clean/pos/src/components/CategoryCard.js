import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * Category card — extended to also show the product count and make the
 * whole card tappable (opens the Product List for that category).
 *
 * Props:
 *  - category: { _id, category, description, is_active }
 *  - productCount: number — count of products belonging to this category
 *  - onEdit, onDelete, onToggleStatus: (category) => void
 *  - onPress: (category) => void — open Product List for this category
 */
const CategoryCard = ({
  category,
  productCount,
  onPress,
  onEdit,
  onAddItem,
}) => {
  const { category: name, description, is_active } = category;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPress && onPress(category)}
    >
      {/* Top row: icon + name/description + status badge */}
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="tag-outline" size={20} color="#2563EB" />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {name || "Unnamed category"}
          </Text>
          {!!description && (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.statusBadge,
            is_active ? styles.statusActive : styles.statusInactive,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: is_active ? "#16A34A" : "#94A3B8" },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: is_active ? "#16A34A" : "#64748B" },
            ]}
          >
            {is_active ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      <View style={styles.separator} />

      {/* Bottom row: product count + actions */}
      <View style={styles.bottomRow}>
        <View style={styles.productCountWrap}>
          <MaterialCommunityIcons name="package-variant-closed" size={15} color="#64748B" />
          <Text style={styles.productCountText}>
            {productCount} {productCount === 1 ? "Product" : "Products"}
          </Text>
        </View>

<View style={styles.actions}>
  <TouchableOpacity
    style={styles.addButton}
    activeOpacity={0.8}
  onPress={(e) => {
  e.stopPropagation?.();
  onAddItem?.(category);
}}
  >
    <MaterialCommunityIcons
      name="plus"
      size={18}
      color="#16A34A"
    />
    <Text style={styles.addText}>Add Item</Text>
  </TouchableOpacity>

<TouchableOpacity
  style={styles.editButton}
  activeOpacity={0.8}
  onPress={(e) => {
    e.stopPropagation?.();
    onEdit?.(category);
  }}
>
    <MaterialCommunityIcons
      name="pencil-outline"
      size={18}
      color="#2563EB"
    />
    <Text style={styles.editText}>Edit</Text>
  </TouchableOpacity>
</View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EBF4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  textBlock: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  description: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: "#F0FDF4",
  },
  statusInactive: {
    backgroundColor: "#F1F5F9",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 14,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productCountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  productCountText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
actions: {
  flexDirection: "row",
},
editButton: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#EFF6FF",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 8,
},

editText: {
  marginLeft: 6,
  fontSize: 13,
  fontWeight: "700",
  color: "#2563EB",
},

addButton: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#ECFDF5",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 8,
  marginRight: 8,
},

addText: {
  marginLeft: 6,
  fontSize: 13,
  fontWeight: "700",
  color: "#16A34A",
},
});

export default CategoryCard;