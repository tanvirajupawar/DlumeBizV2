import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * Empty state shown when a category has no products yet.
 */
const EmptyProduct = ({ onAdd, categoryName }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="package-variant" size={42} color="#93C5FD" />
      </View>

      <Text style={styles.title}>No Products</Text>
      <Text style={styles.subtitle}>
        {categoryName
          ? `"${categoryName}" doesn't contain any products yet.`
          : "This category doesn't contain any products."}
      </Text>

      <TouchableOpacity style={styles.addButton} onPress={onAdd} activeOpacity={0.85}>
        <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add First Product</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: "#EBF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 20,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 11,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});

export default EmptyProduct;