// src/components/AssignProductModal.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  Image,
  FlatList,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "./Colors";

const MAX_CONTENT_WIDTH = 720;

const stockColor = (qty) => {
  if (qty === 0) return "#DC2626";
  if (qty < 10) return "#D97706";
  return "#16A34A";
};
const stockBg = (qty) => {
  if (qty === 0) return "#FEF2F2";
  if (qty < 10) return "#FFFBEB";
  return "#F0FDF4";
};

/**
 * Full-page "Add Products" screen, styled to match CustomerFormScreen
 * exactly (navy header, underline search field, section title scale,
 * centered max-width column). Lets the user multi-select products via
 * checkboxes and assign them all at once to the current category.
 */
export default function AssignProductModal({
  visible,
  allProducts,
  currentCategoryId,
  categoryName,
  onAssign,
  onClose,
}) {
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selected, setSelected] = useState({}); // { [productId]: true }

  useEffect(() => {
    if (visible) {
      setSearch("");
      setSelected({});
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProducts.filter((p) => {
      const notHere = (p.category_id || p.category?._id) !== currentCategoryId;
      if (!q) return notHere;
      return (
        notHere &&
        (p.product?.toLowerCase().includes(q) ||
          p.type?.toLowerCase().includes(q) ||
          p.size?.toLowerCase().includes(q))
      );
    });
  }, [allProducts, currentCategoryId, search]);

  const selectedCount = Object.keys(selected).filter((k) => selected[k]).length;

  const toggleSelect = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAll = () => {
    if (selectedCount === filtered.length) {
      setSelected({});
    } else {
      const next = {};
      filtered.forEach((p) => {
        next[p._id] = true;
      });
      setSelected(next);
    }
  };

  const handleClose = () => {
    setSearch("");
    setSelected({});
    onClose?.();
  };

  const handleAddSelected = () => {
    const productsToAssign = filtered.filter((p) => selected[p._id]);
    if (productsToAssign.length === 0) return;
    onAssign(productsToAssign);
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safe} testID="assign-product-safe-area">
        {/* Header — identical structure to CustomerFormScreen */}
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            hitSlop={8}
            style={styles.headerIconBtn}
            testID="assign-product-back-button"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textOnDark} />
          </Pressable>
          <Text style={styles.headerTitle}>Add Products</Text>
          <Pressable
            onPress={handleAddSelected}
            hitSlop={8}
            style={styles.saveBtn}
            disabled={selectedCount === 0}
            testID="assign-product-save-button"
          >
            <Text style={[styles.saveText, selectedCount === 0 && styles.saveTextDisabled]}>
              {selectedCount > 0 ? `Add (${selectedCount})` : "Add"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Select Products section */}
          <View style={styles.section}>
            <View style={styles.centerCol}>
              <Text style={styles.sectionTitle}>
                Select Products{categoryName ? ` for ${categoryName}` : ""}
              </Text>

              {/* Search — same underline FormField look as CustomerFormScreen */}
              <View style={styles.field}>
                <Text style={styles.label}>Search</Text>
                <View style={styles.searchInputRow}>
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search products…"
                    placeholderTextColor={COLORS.textMuted}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    autoCorrect={false}
                    style={[
                      styles.input,
                      styles.searchInputText,
                      { borderBottomColor: searchFocused ? COLORS.blue : COLORS.divider },
                    ]}
                  />
                  {search.length > 0 && (
                    <Pressable
                      onPress={() => setSearch("")}
                      hitSlop={8}
                      style={styles.searchClearBtn}
                    >
                      <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Section separator strip — matches CustomerFormScreen's sectionDivider */}
          <View style={styles.sectionDivider} />

          {/* Products list section */}
          <View style={styles.section}>
            <View style={styles.centerCol}>
              {filtered.length > 0 && (
                <Pressable style={styles.selectAllRow} onPress={toggleSelectAll}>
                  <MaterialCommunityIcons
                    name={
                      selectedCount === filtered.length
                        ? "checkbox-marked"
                        : selectedCount > 0
                        ? "minus-box-outline"
                        : "checkbox-blank-outline"
                    }
                    size={22}
                    color={selectedCount > 0 ? COLORS.blue : COLORS.textMuted}
                  />
                  <Text style={styles.selectAllText}>
                    {selectedCount === filtered.length ? "Deselect all" : "Select all"}
                  </Text>
                  <Text style={styles.selectAllCount}>
                    {filtered.length} product{filtered.length === 1 ? "" : "s"}
                  </Text>
                </Pressable>
              )}

              {filtered.length === 0 ? (
                <Text style={styles.emptyText}>No products found</Text>
              ) : (
                filtered.map((p) => {
                  const qty = p.stock || p.total_stock || 0;
                  const currentCatName = p.category?.category || p.category_name || "";
                  const isChecked = !!selected[p._id];
                  return (
                    <Pressable
                      key={p._id}
                      onPress={() => toggleSelect(p._id)}
                      style={[styles.productRow, isChecked && styles.productRowChecked]}
                      testID={`assign-product-row-${p._id}`}
                    >
                      <MaterialCommunityIcons
                        name={isChecked ? "checkbox-marked" : "checkbox-blank-outline"}
                        size={22}
                        color={isChecked ? COLORS.blue : COLORS.textMuted}
                      />

                      {p.image ? (
                        <Image source={{ uri: p.image }} style={styles.thumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.thumb, styles.thumbPlaceholder]}>
                          <MaterialCommunityIcons
                            name="image-outline"
                            size={16}
                            color={COLORS.divider}
                          />
                        </View>
                      )}

                      <View style={styles.rowInfo}>
                        <Text numberOfLines={1} style={styles.rowName}>
                          {p.product}
                        </Text>
                        <Text style={styles.rowSub}>
                          {[p.type, p.size, currentCatName].filter(Boolean).join(" · ")}
                        </Text>
                      </View>

                      <View style={[styles.stockPill, { backgroundColor: stockBg(qty) }]}>
                        <Text style={[styles.stockText, { color: stockColor(qty) }]}>{qty}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.card,
  },

  // ── Header — matches CustomerFormScreen ──
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
    flex: 1,
    color: COLORS.textOnDark,
    fontSize: 19,
    fontWeight: "700",
  },
  saveBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  saveText: {
    color: COLORS.textOnDark,
    fontSize: 16,
    fontWeight: "700",
  },
  saveTextDisabled: {
    opacity: 0.5,
  },

  // ── Scroll / sections — matches CustomerFormScreen ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  centerCol: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
  },
  sectionDivider: {
    height: 8,
    backgroundColor: COLORS.bg,
  },

  // ── Fields — matches CustomerFormScreen's FormField ──
  field: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: 21,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  input: {
    fontSize: 19,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1.5,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInputText: {
    flex: 1,
  },
  searchClearBtn: {
    marginLeft: SPACING.sm,
  },

  // ── Select all ──
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginBottom: SPACING.sm,
  },
  selectAllText: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flex: 1,
  },
  selectAllCount: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  // ── Product rows ──
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  productRowChecked: {
    backgroundColor: "#EFF6FF",
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: RADIUS?.sm || 9,
    backgroundColor: "#F1F5F9",
    flexShrink: 0,
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  rowSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stockPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  stockText: {
    fontSize: 13,
    fontWeight: "700",
  },

  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: SPACING.xl,
  },
});