
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function AddItemScreen({ navigation, route }) {
  const { category, products = [], onAdd } = route.params;

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState({});

  const isAlreadyInCategory = (item) =>
    !!category && item.category_id === category._id;

  const isInOtherCategory = (item) =>
    !!category && !!item.category_id && item.category_id !== category._id;

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((item) => {
      return (
        item.product?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q) ||
        item.size?.toLowerCase().includes(q) ||
        item.barcode?.toLowerCase().includes(q)
      );
    });
  }, [products, search]);

  const toggleSelect = (item) => {
    if (isAlreadyInCategory(item)) return;

    if (selectedIds[item._id]) {
      setSelectedIds((prev) => {
        const next = { ...prev };
        delete next[item._id];
        return next;
      });
      return;
    }

    if (isInOtherCategory(item)) {
      Alert.alert(
        "Move item?",
        `"${item.product}" is currently in "${item.category_name}". Move it to "${category?.category}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Move",
            onPress: () =>
              setSelectedIds((prev) => ({ ...prev, [item._id]: true })),
          },
        ]
      );
      return;
    }

    setSelectedIds((prev) => ({ ...prev, [item._id]: true }));
  };

  const selectedCount = Object.keys(selectedIds).length;

  const handleClose = () => navigation.goBack();

  const handleAdd = () => {
    const selectedProducts = products.filter((p) => selectedIds[p._id]);
onAdd?.(category, selectedProducts);
    navigation.goBack();
  };

  const renderItem = ({ item }) => {
    const disabled = isAlreadyInCategory(item);
    const otherCategory = isInOtherCategory(item);
    const checked = !!selectedIds[item._id];

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={disabled ? 1 : 0.6}
        onPress={() => toggleSelect(item)}
        disabled={disabled}
      >
        <View
          style={[
            styles.checkbox,
            checked && styles.checkboxChecked,
            disabled && styles.checkboxDisabled,
          ]}
        >
          {checked && (
            <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" />
          )}
        </View>

        <View style={styles.infoBlock}>
          <Text
            style={[styles.itemName, disabled && styles.textDisabled]}
            numberOfLines={1}
          >
            {item.product}
          </Text>

          <View style={styles.metaRow}>
            <Text style={[styles.itemMeta, disabled && styles.textDisabled]}>
              {[item.type, item.size].filter(Boolean).join(" \u00B7 ") || "-"}
            </Text>

            {disabled && (
              <View style={styles.tagThisCategory}>
                <Text style={styles.tagThisCategoryText}>
                  {category?.category}
                </Text>
              </View>
            )}

    
{otherCategory && (
  <View style={styles.tagOtherCategory}>
    <Text style={styles.tagOtherCategoryText} numberOfLines={1}>
      {item.category || item.category_name}
    </Text>
  </View>
)}

          </View>
        </View>

        <Text style={[styles.itemPrice, disabled && styles.textDisabled]}>
          {"\u20B9"}
          {Number(item.salePrice || item.price || 0).toFixed(0)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Add Items</Text>
          {!!category?.category && (
            <Text style={styles.headerSubtitle}>to {category.category}</Text>
          )}
        </View>
        <View style={styles.headerBtn} />
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products"
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <MaterialCommunityIcons name="close-circle" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      </View>

      {/* Vertical list */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.selectedCountText}>{selectedCount} selected</Text>
        <TouchableOpacity
          style={[styles.addBtn, selectedCount === 0 && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={selectedCount === 0}
        >
          <Text style={styles.addBtnText}>
            Add {selectedCount > 0 ? `(${selectedCount})` : ""}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
  },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBlock: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  headerSubtitle: { fontSize: 12, color: "#64748B", marginTop: 1 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A" },

  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },

  // Tight, single-block row — checkbox, info, price all close together
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  checkboxDisabled: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },

  infoBlock: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  textDisabled: { color: "#94A3B8" },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  itemMeta: { fontSize: 12, color: "#64748B" },

  tagThisCategory: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tagThisCategoryText: { fontSize: 10.5, fontWeight: "700", color: "#2563EB" },

  tagOtherCategory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    maxWidth: 110,
  },
  tagOtherCategoryText: { fontSize: 10.5, fontWeight: "700", color: "#B45309" },

  itemPrice: { fontSize: 13.5, fontWeight: "700", color: "#0F172A" },

  emptyWrap: { paddingVertical: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: "#94A3B8" },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  selectedCountText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  addBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: "#2563EB",
    borderRadius: 10,
  },
  addBtnDisabled: { backgroundColor: "#CBD5E1" },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});