import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * Header for the Product List screen.
 * ← Back   |   Category Name + count   |   + Add Product
 */
const ProductHeader = ({ categoryName, productCount, onBack, onAddProduct }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#2563EB" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.titleBlock}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {categoryName}
          </Text>
          <Text style={styles.productCount}>
            {productCount} {productCount === 1 ? "Product" : "Products"}
          </Text>
        </View>
      </View>

     {onAddProduct && (
  <TouchableOpacity
    style={styles.addButton}
    onPress={onAddProduct}
  >
    <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
    <Text style={styles.addText}>Add Product</Text>
  </TouchableOpacity>
)}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: "#EBF4FF",
  },
  backText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: "#E2E8F0",
  },
  titleBlock: {
    flexShrink: 1,
  },
  categoryName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.1,
  },
  productCount: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 1,
    fontWeight: "400",
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

export default ProductHeader;