import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  printBarcodeLabels,
  printBitmapTest
} from "../../services/printer";
import {
  printBarcodeTest
} from "../../services/printer";



import LoadingProducts from "../../components/LoadingProducts";
import EmptyProduct   from "../../components/EmptyProduct";
import Header from "../../components/Header";
import AssignProductModal from "../../components/AssignProductModal";

import { fetchCategories } from "../../api/category";
import {
  fetchProducts,
  createProduct,
  updateProduct,
} from "../../api/product";

// ════════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const ALL_CATEGORY = { _id: "__all__", category: "All" };

const CARD_COLUMNS = 8;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP     = 6;
const CARD_H_PAD   = 10;
const CARD_WIDTH   = (SCREEN_WIDTH - CARD_H_PAD * 2 - CARD_GAP * (CARD_COLUMNS - 1)) / CARD_COLUMNS;

const stockColor = (qty) => {
  if (qty === 0) return "#DC2626";
  if (qty < 10)  return "#D97706";
  return "#16A34A";
};
const stockBg = (qty) => {
  if (qty === 0) return "#FEF2F2";
  if (qty < 10)  return "#FFFBEB";
  return "#F0FDF4";
};

// ════════════════════════════════════════════════════════════════════════════
//  CATEGORY PICKER SHEET  (exported)
// ════════════════════════════════════════════════════════════════════════════

export function CategoryPickerSheet({ visible, categories = [], value, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sh.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={sh.sheet} activeOpacity={1}>
          <View style={sh.handle} />
          <Text style={sh.title}>Select Category</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {categories.map((cat) => {
              const isSelected = cat._id === value;
              return (
                <TouchableOpacity
                  key={cat._id}
                  style={[sh.option, isSelected && sh.optionActive]}
                  onPress={() => { onSelect(cat._id); onClose(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[sh.optionText, isSelected && sh.optionTextActive]}>
                    {cat.category || cat.category_name}
                  </Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={18} color="#2563EB" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export function CategoryDropdown({ categories = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c._id === value);
  return (
    <>
      <TouchableOpacity style={sh.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={selected ? sh.triggerText : sh.triggerPlaceholder}>
          {selected ? (selected.category || selected.category_name) : "Select category…"}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#94A3B8" />
      </TouchableOpacity>
      <CategoryPickerSheet
        visible={open}
        categories={categories}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const sh = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet:            { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 36 },
  handle:           { width: 44, height: 5, borderRadius: 3, backgroundColor: "#E2E8F0", alignSelf: "center", marginTop: 12, marginBottom: 18 },
  title:            { fontSize: 19, fontWeight: "700", color: "#0F172A", marginBottom: 12 },
  option:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  optionActive:     { backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 10 },
  optionText:       { fontSize: 16, color: "#334155", fontWeight: "600" },
  optionTextActive: { color: "#2563EB", fontWeight: "700" },
  trigger:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 50, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", marginBottom: 14 },
  triggerText:        { fontSize: 15, color: "#0F172A", fontWeight: "600" },
  triggerPlaceholder: { fontSize: 15, color: "#94A3B8" },
});



const apm = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet:            { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 36, maxHeight: "80%" },
  handle:           { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  header:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14 },
  title:            { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  searchWrap:       { flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginBottom: 8, backgroundColor: "#F8FAFC", borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 10, height: 44 },
  searchIcon:       { marginRight: 6 },
  searchInp:        { flex: 1, fontSize: 16, color: "#0F172A" },
  list:             { paddingHorizontal: 14 },
  empty:            { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText:        { fontSize: 16, color: "#CBD5E1" },
  row:              { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  thumb:            { width: 44, height: 44, borderRadius: 9, backgroundColor: "#F1F5F9", flexShrink: 0 },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  rowInfo:          { flex: 1 },
  rowName:          { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  rowSub:           { fontSize: 14, color: "#94A3B8", marginTop: 2 },
  stockPill:        { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  stockText:        { fontSize: 13, fontWeight: "700" },
});

// ════════════════════════════════════════════════════════════════════════════
//  MINI PRODUCT CARD  (6 per row)
// ════════════════════════════════════════════════════════════════════════════

const MiniProductCard = React.memo(({ item, onPress, onImageChange, onPrint }) => {
    const qty      = item.stock || item.total_stock || 0;
  const mrp      = Number(item.salePrice || item.price || 0).toFixed(0);
  const inactive = item.is_active === false;


  return (
    <TouchableOpacity
      style={[mc.root, { width: CARD_WIDTH }, inactive && mc.rootInactive]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {/* Image — separate pressable so tap on image = pick, tap on card = edit */}
    <View style={mc.imgWrap}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={[mc.img, inactive && mc.imgFaded]}
            resizeMode="cover"
          />
        ) : (
          <View style={[mc.imgPlaceholder, inactive && mc.imgFaded]}>
            <MaterialCommunityIcons name="camera-plus-outline" size={20} color="#CBD5E1" />
          </View>
        )}
      
     </View>

      {/* Name */}
      <Text numberOfLines={2} style={[mc.name, inactive && mc.nameInactive]}>
        {item.product}
      </Text>

      {/* Price */}
      <Text style={[mc.price, inactive && mc.priceInactive]} numberOfLines={1}>
        ₹{mrp}
      </Text>

      {/* Stock pill */}
      <View style={[mc.stockPill, { backgroundColor: inactive ? "#F1F5F9" : stockBg(qty) }]}>
        <Text style={[mc.stockText, { color: inactive ? "#94A3B8" : stockColor(qty) }]}>
          {qty === 0 ? "Out" : qty < 10 ? `Low · ${qty}` : qty}
        </Text>
      </View>

      <TouchableOpacity
    style={mc.printButton}
    onPress={() => onPrint(item)}
    activeOpacity={0.8}
>
    <MaterialCommunityIcons
        name="printer"
        size={14}
        color="#fff"
    />

    <Text style={mc.printText}>
        Label
    </Text>
</TouchableOpacity>
    </TouchableOpacity>
  );
});

const mc = StyleSheet.create({
  root:         { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#EEF0F4", overflow: "hidden", marginBottom: CARD_GAP },
  rootInactive: { borderColor: "#F1F5F9", opacity: 0.65 },
  imgWrap:      { width: "100%", aspectRatio: 1, backgroundColor: "#F8FAFC", position: "relative" },
  img:          { width: "100%", height: "100%" },
  imgPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  imgFaded:     { opacity: 0.4 },
  camBadge:     { position: "absolute", bottom: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },

  // Font sizes bumped to match OrdersScreen scale
  name:          { fontSize: 17, fontWeight: "600", color: "#0F172A", paddingHorizontal: 5, paddingTop: 5, lineHeight: 16, minHeight: 32 },
  nameInactive:  { color: "#94A3B8" },
  price:         { fontSize: 16, fontWeight: "800", color: "#0F172A", paddingHorizontal: 5, paddingTop: 2 },
  priceInactive: { color: "#CBD5E1" },
  stockPill:     { marginHorizontal: 5, marginTop: 3, marginBottom: 5, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 20, alignSelf: "flex-start" },
  stockText:     { fontSize: 10, fontWeight: "700" },

  printButton: {
    marginHorizontal: 5,
    marginBottom: 6,
    marginTop: 4,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
},

printText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
},
});

// ════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════

const ProductCatalogScreen = ({
  products,
  refreshProducts,
  searchValue = "",
  onSearchChange = () => {},
  onMenuPress = () => {},
  onOpenProductForm = () => {},
  registerAddProductTrigger = () => {},

  selectedCategory,
  onCategoryChange,
  onAddCategory = () => {},
  onEditCategory = () => {},   // ← new

  categories = [],
  refreshCategories = async () => {},
}) => {


const [allProducts,     setAllProducts]     = useState([]);
  const [refreshing,      setRefreshing]      = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // categories now come from POSScreen as a prop — no local fetch here

  // ── Data fetching ────────────────────────────────────────────────────────

const handlePrintLabel = async (product) => {
  try {
    const result = await printBarcodeLabels([
      {
        name: product.product,
        barcode: product.barcode,
        price: product.salePrice || product.price || 0,
      },
    ]);

    if (!result.success) {
      Alert.alert(
        "Print Error",
        result.error?.message || "Failed to print"
      );
    }
  } catch (error) {
    console.log("LABEL PRINT ERROR:", error);

    Alert.alert(
      "Print Error",
      error?.message || "Failed to print label"
    );
  }
};

const loadAllProducts = useCallback(async () => {
  try {
    const data = await fetchProducts();
    setAllProducts(data || []);
  } catch {}
}, []);

useEffect(() => { loadAllProducts(); }, [loadAllProducts]);

const onRefresh = useCallback(async () => {
  try {
    setRefreshing(true);
    await refreshProducts();
    await loadAllProducts();
    await refreshCategories();
  } finally {
    setRefreshing(false);
  }
}, [refreshProducts, loadAllProducts, refreshCategories]);

  // ── Filtered list ────────────────────────────────────────────────────────

const filteredProducts = useMemo(() => {
  let data = [...products];

  // Filter by category
  if (selectedCategory._id !== ALL_CATEGORY._id) {
    data = data.filter((p) => {
      const catId =
        p.category_id ||
        p.category?._id;

      return catId === selectedCategory._id;
    });
  }

  // Search filter
  const q = searchValue.trim().toLowerCase();

  if (q) {
    data = data.filter((p) =>
      (p.product || "").toLowerCase().includes(q) ||
      (p.barcode || "").toLowerCase().includes(q) ||
      (p.type || "").toLowerCase().includes(q) ||
      (p.size || "").toLowerCase().includes(q)
    );
  }

  return data;
}, [products, selectedCategory, searchValue]);

  // ── Handlers ─────────────────────────────────────────────────────────────

const handleSaveProduct = useCallback(
  async (formData, editingProductId) => {
    if (editingProductId) {
      await updateProduct(editingProductId, formData);
    } else {
      await createProduct(formData);
    }

    await refreshProducts();
    await loadAllProducts();
  },
  [refreshProducts, loadAllProducts]
);
const handleImageChange = useCallback(async (productId, newUri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(newUri, {
      encoding: "base64",
    });

    const response = await fetch(
      "http://192.168.1.14:3001/api/upload/product-image",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${base64}`,
        }),
      }
    );

    const data = await response.json();

    if (!data.success) {
      Alert.alert("Upload Failed", data.message);
      return;
    }

    await updateProduct(productId, {
      image: data.image.url,
    });

 await refreshProducts();
await loadAllProducts();



    Alert.alert("Success", "Image updated successfully.");
  } catch (err) {
    console.log(err);
    Alert.alert("Error", "Failed to update product image.");
  }
}, [refreshProducts, loadAllProducts]);

const handleAssignProducts = useCallback(
  async (productsToAssign) => {
    try {
      await Promise.all(
        productsToAssign.map((p) =>
          updateProduct(p._id, { category_id: selectedCategory._id })
        )
      );
      await refreshProducts();
      await loadAllProducts();
    } catch {
      Alert.alert("Error", "Failed to assign products to this category.");
    }
  },
  [selectedCategory._id, refreshProducts, loadAllProducts]
);

const handleCategorySelect = (cat) => {
  onCategoryChange?.(cat);
};

  const handleAdd = () => {
    if (selectedCategory._id !== ALL_CATEGORY._id) {
      setAssignModalOpen(true);
      return;
    }
    onOpenProductForm({
      product: null,
      categories,
      initialCategoryId: "",
      onSave: (formData) => handleSaveProduct(formData, null),
    });
  };

  const handleRowPress = (product) => {
    onOpenProductForm({
      product,
      categories,
      initialCategoryId: product.category_id || product.category?._id || "",
      onSave: (formData) => handleSaveProduct(formData, product._id),
    });
  };

  useEffect(() => {
    registerAddProductTrigger(handleAdd);
  }, [registerAddProductTrigger, categories, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render: category tab ─────────────────────────────────────────────────

const renderCategoryTab = ({ item }) => {
    const isActive = item._id === selectedCategory._id;
    const isAllTab = item._id === ALL_CATEGORY._id;
    return (
      <TouchableOpacity
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => handleCategorySelect(item)}
        onLongPress={() => {
          if (!isAllTab) onEditCategory(item);
        }}
        delayLongPress={350}
        activeOpacity={0.75}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {item.category || item.category_name}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Render: table row (All tab) ──────────────────────────────────────────

  const renderTableRow = useCallback(({ item }) => {
    const qty       = item.stock || item.total_stock || 0;
    const mrp       = Number(item.salePrice || item.price || 0).toFixed(0);
    const stockIn   = item.stock_in    ?? item.stockIn    ?? 0;
    const stockOut  = item.stock_out   ?? item.stockOut   ?? 0;
    const barcodeQty= item.barcode_qty ?? item.barcodeQty ?? 1;
    const inactive  = item.is_active === false;

    return (
      <TouchableOpacity
        style={[styles.tableRow, inactive && styles.tableRowInactive]}
        onPress={() => handleRowPress(item)}
        activeOpacity={0.6}
      >
        <View style={styles.colProduct}>
      
          <Text numberOfLines={1} style={[styles.colProductName, inactive && styles.colProductNameInactive]}>
            {item.product}
          </Text>
        </View>

        <Text style={[styles.colCell, inactive && styles.colCellInactive]}>{item.type || "—"}</Text>
        <Text style={[styles.colCell, inactive && styles.colCellInactive]}>{item.size || "—"}</Text>
        <Text style={[styles.colCell, inactive && styles.colCellInactive]}>₹{mrp}</Text>
        <Text style={[styles.colCell, inactive && styles.colCellInactive]}>{stockIn}</Text>
        <Text style={[styles.colCell, inactive && styles.colCellInactive]}>{stockOut}</Text>
        <Text style={[styles.colStock, inactive ? styles.colCellInactive : { color: stockColor(qty) }]}>
          {qty}
        </Text>

        <View style={styles.colScanQtyWrap}>
          <View style={[styles.scanQtyPill, inactive && styles.scanQtyPillInactive]}>
            <Text style={[styles.scanQtyText, inactive && styles.scanQtyTextInactive]}>×{barcodeQty}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render: mini card (category tab) ────────────────────────────────────

const renderMiniCard = useCallback(({ item }) => (
    <MiniProductCard
        item={item}
        onPress={handleRowPress}
        onImageChange={handleImageChange}
        onPrint={handlePrintLabel}
    />
), [handleImageChange, handlePrintLabel]);

  // ── Main content ─────────────────────────────────────────────────────────

  const isAllTab = selectedCategory._id === ALL_CATEGORY._id;

  const renderMainContent = () => {

    if (products.length === 0 && isAllTab) {
      return <EmptyProduct onAdd={handleAdd} />;
    }

    // ── Category tab → compact card grid ─────────────────────────────────
    if (!isAllTab) {
      if (filteredProducts.length === 0) {
        return (
          <View style={styles.noResults}>
            <MaterialCommunityIcons name="package-variant-closed" size={48} color="#E2E8F0" />
            <Text style={styles.noResultsText}>No products in this category</Text>
            <TouchableOpacity
              style={styles.assignCta}
              onPress={() => setAssignModalOpen(true)}
            >
              <Text style={styles.assignCtaText}>Add products</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          renderItem={renderMiniCard}
          numColumns={CARD_COLUMNS}
          key={`cards-${CARD_COLUMNS}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardGrid}
          columnWrapperStyle={styles.cardColWrap}
        />
      );
    }

    // ── All tab → table ───────────────────────────────────────────────────
    return (
      <>
        <View style={styles.tableHeader}>
          <Text style={styles.headerProduct}>Product</Text>
          <Text style={styles.headerCell}>Type</Text>
          <Text style={styles.headerCell}>Size</Text>
          <Text style={styles.headerCell}>MRP</Text>
          <Text style={styles.headerCell}>In</Text>
          <Text style={styles.headerCell}>Out</Text>
          <Text style={styles.headerCell}>Total</Text>
          <Text style={styles.headerCell}>Scan Qty</Text>
        </View>
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          renderItem={renderTableRow}
          key="table"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <MaterialCommunityIcons name="text-search" size={44} color="#CBD5E1" />
              <Text style={styles.noResultsText}>No products found</Text>
            </View>
          }
        />
      </>
    );
  };

  // ── Return ───────────────────────────────────────────────────────────────

  return (
<SafeAreaView style={styles.safeArea}>
<Header
  title="Products"
  leftWidth={380}
  alwaysShowSearch
  onMenuPress={onMenuPress}
  searchValue={searchValue}
  onSearchChange={onSearchChange}
  hideScanner
  hideCustomer
  hideHeldCarts
  hideViewHeldCarts
  hideMore
  hideAdd={false}
  onAddPress={handleAdd}
  addLabel={
    isAllTab
      ? "Add New Product"
      : `Add to ${selectedCategory.category || selectedCategory.category_name}`
  }
/>

  <View style={styles.screen}>

      {/* Tab bar */}
<View style={styles.tabBar}>
  <FlatList
    data={[ALL_CATEGORY, ...categories]}
    keyExtractor={(item) => item._id}
    renderItem={renderCategoryTab}
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.tabList}
    style={styles.tabScroll}
  />

<TouchableOpacity
  style={styles.addCategoryBtn}
  onPress={onAddCategory}
  activeOpacity={0.8}
  testID="add-category-button"
>
  <MaterialCommunityIcons
    name="plus"
    size={18}
    color="#FFFFFF"
  />

  <Text style={styles.addCategoryText}>
    Add Category
  </Text>
</TouchableOpacity>
</View>

        <View style={styles.divider} />


        {/* Content */}
     <View style={styles.contentArea}>
  {renderMainContent()}

 
</View>

      </View>

      {/* Assign product modal — triggered by header Add button on category tabs */}
<AssignProductModal
  visible={assignModalOpen}
  allProducts={allProducts}
  currentCategoryId={selectedCategory._id}
  categoryName={selectedCategory.category || selectedCategory.category_name}
  onAssign={handleAssignProducts}
  onClose={() => setAssignModalOpen(false)}
/>

    </SafeAreaView>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({

  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  screen:   { flex: 1 },

  // ── Tab bar ──────────────────────────────────────────────────────────────
  tabBar:    { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  tabScroll: { flex: 1 },
  tabList:   { gap: 8, paddingRight: 4 },


  divider:     { height: 1, backgroundColor: "#E2E8F0" },
  contentArea: { flex: 1 },

  // ── Card grid ─────────────────────────────────────────────────────────────
  cardGrid:    { padding: CARD_H_PAD, paddingBottom: 24 },
  cardColWrap: { gap: CARD_GAP, marginBottom: 0 },

  // ── Table ─────────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerProduct: { flex: 3, color: "#94A3B8", fontWeight: "700", fontSize: 16, letterSpacing: 0.4 },
  headerCell:    { flex: 1, color: "#94A3B8", fontWeight: "700", fontSize: 16, letterSpacing: 0.4, textAlign: "center" },

  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  tableRowInactive: { backgroundColor: "#F8FAFC" },

  colProduct:              { flex: 3, flexDirection: "row", alignItems: "center", paddingRight: 10 },
  thumbFaded:              { opacity: 0.35 },
  rowThumb:                { width: 42, height: 42, borderRadius: 9, backgroundColor: "#F1F5F9", flexShrink: 0 },
  rowThumbPlaceholder:     { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  colProductName:          { flex: 1, fontSize: 19, fontWeight: "700", color: "#0F172A", marginLeft: 12 },
  colProductNameInactive:  { color: "#94A3B8" },

  colCell:         { flex: 1, textAlign: "center", color: "#475569", fontSize: 19 },
  colCellInactive: { color: "#CBD5E1" },
  colStock:        { flex: 1, textAlign: "center", fontSize: 19, fontWeight: "700" },

  colScanQtyWrap:  { flex: 1, alignItems: "center" },
  scanQtyPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scanQtyPillInactive: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  scanQtyText:         { fontSize: 18, fontWeight: "700", color: "#1D4ED8" },
  scanQtyTextInactive: { color: "#94A3B8" },

  // ── Empty / no results ────────────────────────────────────────────────────
  noResults:     { alignItems: "center", justifyContent: "center", paddingVertical: 70, gap: 14 },
  noResultsText: { color: "#94A3B8", fontSize: 16 },
  assignCta:     { marginTop: 4, backgroundColor: "#2563EB", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  assignCtaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
tab: {
  height: 36,
  paddingHorizontal: 16,
  borderRadius: 8,
  borderWidth: 1.5,
  borderColor: "#E2E8F0",
  backgroundColor: "#F8FAFC",
  alignItems: "center",
  justifyContent: "center",
},
tabActive:     { backgroundColor: "#2563EB", borderColor: "#2563EB" },
tabText:       { fontSize: 19, fontWeight: "600", color: "#475569" },
tabTextActive: { color: "#fff" },


// ── Add category button ──
addCategoryBtn: {
  height: 38,
  paddingHorizontal: 14,
  borderRadius: 9,

  backgroundColor: "#2563EB",

  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",

  gap: 5,
  flexShrink: 0,

  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.12,
  shadowRadius: 3,
  elevation: 2,
},

addCategoryText: {
  color: "#FFFFFF",
  fontSize: 18,
  fontWeight: "700",
},
});

export default ProductCatalogScreen;