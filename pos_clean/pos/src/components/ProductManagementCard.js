import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const ProductManagementCard = ({
  product,
  onEdit,
  onDelete,
}) => {
  return (
    <View style={styles.card}>
      {/* Image */}

      <View style={styles.imageContainer}>
        {product.imageUri ? (
          <Image
            source={{ uri: product.imageUri }}
            style={styles.image}
          />
        ) : (
          <MaterialCommunityIcons
            name="image-outline"
            size={40}
            color="#94A3B8"
          />
        )}
      </View>

      {/* Name */}

      <Text
        numberOfLines={2}
        style={styles.name}
      >
        {product.product}
      </Text>

      {/* Barcode */}

      <Text style={styles.barcode}>
        {product.barcode || "-"}
      </Text>

      {/* Price */}

      <Text style={styles.price}>
        ₹{Number(product.salePrice || product.price || 0).toFixed(2)}
      </Text>

      {/* Stock */}

      <View style={styles.stockContainer}>
        <MaterialCommunityIcons
          name="package-variant"
          size={16}
          color="#16A34A"
        />

        <Text style={styles.stock}>
          Stock : {product.stock || product.total_stock || 0}
        </Text>
      </View>

      {/* Buttons */}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEdit(product)}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={18}
            color="#2563EB"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(product)}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={18}
            color="#DC2626"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProductManagementCard;

const styles = StyleSheet.create({
card: {
  backgroundColor: "#FFF",
  borderRadius: 16,
  padding: 12,
  elevation: 3,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: {
    width: 0,
    height: 2,
  },
},

  imageContainer: {
    height: 120,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  barcode: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 12,
  },

  price: {
    marginTop: 8,
    fontWeight: "700",
    fontSize: 18,
    color: "#2563EB",
  },

  stockContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  stock: {
    marginLeft: 5,
    color: "#16A34A",
    fontWeight: "600",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },

  editButton: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginRight: 6,
  },

  deleteButton: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginLeft: 6,
  },
});