// screens/pos/POSScreen.js
import React, { useMemo, useState, useRef } from "react";
import {
  NativeModules,
  NativeEventEmitter,
} from "react-native";
import { View, StyleSheet, StatusBar, TouchableOpacity, Text, Modal
 } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";

import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import OrderPane from "../../components/OrderPane";
import CartPanel from "../../components/CartPanel";
import HeldCartsSheet from "../../components/HeldCartsSheet";
import MoreOptionsSheet from "../../components/MoreOptionsSheet";
import { WALK_IN_CUSTOMER } from "../../components/CustomerSelector";
import CustomerSearchScreen from "../Customer/CustomerSearchScreen";
import CustomerFormScreen from "../Customer/CustomerFormScreen";
import { COLORS, SPACING, RADIUS } from "../../components/Colors";
import { useEffect } from "react";
import { fetchProducts } from "../../api/product";
import { fetchCustomers, createCustomer } from "../../api/customer";

import ProductCatalogScreen from "../ProductCatalog/ProductCatalogScreen";
import ProductFormScreen from "../ProductCatalog/ProductFormScreen";
import ManageCartItemModal from "../../components/ManageCartItemModal";
import RefundsScreen from "../Refunds/RefundsScreen";
import OrdersScreen from "../Orders/OrdersScreen";
import PaymentsScreen from "../Payment/PaymentsScreen";
import { fetchCategories } from "../../api/category";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CategoryModal from "../../components/CategoryModal";
import CalculatorPane from "../../components/CalculatorPane";
import ProfileScreen from "../Profile/ProfileScreen";
import { createCategory, updateCategory, deleteCategory } from "../../api/category";

import { getCached, setCached, getCachedSync } from "../../utils/cache";

const { SunmiScanner } = NativeModules;
const scannerEmitter = new NativeEventEmitter(SunmiScanner);

const APP = { name: "D'LumeBiz", registerType: "Default Register" };

// Cache keys for this screen's own data. Each screen that fetches from the
// API owns its own namespaced key(s) — see the note in OrdersScreen /
// PaymentsScreen / RefundsScreen about not sharing keys across screens
// whose mapped shapes differ.
const CACHE_KEYS = {
  products: "pos:products:v1",
  customers: "pos:customers:v1",
  // Categories are cached WITHOUT the synthetic "All Items" entry — that's
  // prepended locally whenever we set state from either the cache or a
  // fresh fetch, so the cached payload always matches exactly what the API
  // returns.
  categories: "pos:categories:v1",
};

const ALL_ITEMS_CATEGORY = { _id: "all", category: "All Items" };

export default function POSScreen() {
  const [activeNav, setActiveNav] = useState("cart");
  const [profileVisible, setProfileVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [managedItem, setManagedItem] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(WALK_IN_CUSTOMER);

  const handleAddCalculatorItem = (item) => {
  setCartItems((prev) => [...prev, item]);
};

  // ── Instant paint from the in-memory cache ────────────────────────────
  // getCachedSync only checks the in-memory Map in utils/cache.js (no
  // AsyncStorage round-trip), so if this screen has already fetched once
  // this app session, these lazy initializers already have the last-known
  // data the very first time this component renders — no blank catalog,
  // no spinner flash, no re-fetch-on-every-focus flicker when coming back
  // from Checkout or another screen.
  const [products, setProducts] = useState(
    () => getCachedSync(CACHE_KEYS.products)?.data || []
  );
  const [loadingProducts, setLoadingProducts] = useState(
    () => !getCachedSync(CACHE_KEYS.products)?.data
  );
  const [customers, setCustomers] = useState(
    () => getCachedSync(CACHE_KEYS.customers)?.data || []
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // ── Customer search / add ────────────────────────────────────────────────
// ── Customer search / add ────────────────────────────────────────────────
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState("search"); // "search" | "form"
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [customerFormValues, setCustomerFormValues] = useState({});
  const [savingCustomer, setSavingCustomer] = useState(false);

const filteredCustomerResults = useMemo(() => {
  const q = customerSearchText.trim().toLowerCase();

  return customers
    .filter((c) => {
      if (!q) return true;

      const name = (
        c.customer_name ||
        `${c.first_name || ""} ${c.last_name || ""}`
      )
        .trim()
        .toLowerCase();

      const phone = String(c.contact_no_1 || "");

      return name.includes(q) || phone.includes(q);
    })
    .map((c) => ({
      id: c._id || c.id,
      name:
        c.customer_name ||
        `${c.first_name || ""} ${c.last_name || ""}`.trim(),
      phone: c.contact_no_1 || "",
      _raw: c,
    }));
}, [customers, customerSearchText]);

const handleOpenCustomerSearch = () => {
  setCustomerSearchText("");
  setCustomerModalMode("search");
  setCustomerModalVisible(true);
};

const handleCloseCustomerSearch = () => setCustomerModalVisible(false);

const handleSelectCustomerFromSearch = (customer) => {
  setSelectedCustomer(customer._raw || customer);
  setCustomerModalVisible(false);
};


const handleOpenCustomerForm = () => {
  setCustomerFormValues({});
  setCustomerModalMode("form");
};

// "Back" from the form now returns to search, rather than closing everything.
const handleCloseCustomerForm = () => setCustomerModalMode("search");

const handleChangeCustomerForm = (field, text) =>
  setCustomerFormValues((prev) => ({ ...prev, [field]: text }));

const handleSaveCustomerForm = async () => {
  try {
    setSavingCustomer(true);
   const fullName = (customerFormValues.name || "").trim();

const nameParts = fullName.split(/\s+/);

const first_name = nameParts[0] || "";
const last_name = nameParts.slice(1).join(" ");

const payload = {
  first_name,
  last_name,
  contact_no_1: customerFormValues.mobile || "",
  email: customerFormValues.email || "",
  address_line_1: customerFormValues.address1 || "",
  address_line_2: customerFormValues.address2 || "",
  state: customerFormValues.state || "",
};
const created = await createCustomer(payload);

console.log("========== NEW CUSTOMER CREATED ==========");
console.log("CREATED CUSTOMER:", created);
console.log("==========================================");

const newCustomer =
  created?.data?.data ||
  created?.data ||
  created;

console.log("CUSTOMER USED FOR CART:", newCustomer);

setSelectedCustomer(newCustomer);
    await loadCustomers({ silent: true });
    setCustomerModalVisible(false); // done, close the whole flow
  } catch (err) {
    console.log("CUSTOMER SAVE ERROR:", err.response?.data || err.message);
  } finally {
    setSavingCustomer(false);
  }
};
  // ─────────────────────────────────────────────────────────────────────────

  // ── Product form (now a tab, not a pushed screen) ───────────────────────
  const [productFormState, setProductFormState] = useState(null);
  const [navBeforeProductForm, setNavBeforeProductForm] = useState("categories");

  const addProductTriggerRef = useRef(() => {});
  const searchInputRef = useRef(null);
  const isScanningRef = useRef(false);
  const lastScanRef = useRef({ barcode: null, time: 0 }); 
  const registerAddProductTrigger = (fn) => {
    addProductTriggerRef.current = fn;
  };


  const isDuplicateScan = (barcode) => {                     // ← add this function
  const now = Date.now();
  const { barcode: lastBarcode, time: lastTime } = lastScanRef.current;
  const isDupe = barcode === lastBarcode && now - lastTime < 1000;
  lastScanRef.current = { barcode, time: now };
  return isDupe;
};


  const handleOpenProductForm = (formState) => {
    setNavBeforeProductForm(activeNav);
    setProductFormState(formState);
    setActiveNav("productForm");
  };

  const handleCloseProductForm = () => {
    setProductFormState(null);
    setActiveNav(navBeforeProductForm === "productForm" ? "categories" : navBeforeProductForm);
  };

  // ── Held Carts ────────────────────────────────────────────────────────────
  const [heldCarts, setHeldCarts] = useState([]);
  const [heldCartsSheetVisible, setHeldCartsSheetVisible] = useState(false);

  // ── More Options (Hold Cart) ─────────────────────────────────────────────
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);

  const handleHoldCart = () => {
    if (cartItems.length === 0) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setHeldCarts((prev) => [
      ...prev,
      {
        items: cartItems,
        customer: selectedCustomer,
        heldAt: `Held at ${timeStr}`,
      },
    ]);

    setCartItems([]);
    setSelectedCustomer(WALK_IN_CUSTOMER);
  };

  const handleRestoreCart = (index) => {
    const held = heldCarts[index];
    setCartItems(held.items);
    setSelectedCustomer(held.customer || WALK_IN_CUSTOMER);
    setHeldCarts((prev) => prev.filter((_, i) => i !== index));
    setHeldCartsSheetVisible(false);
  };

  const handleDeleteHeldCart = (index) => {
    setHeldCarts((prev) => prev.filter((_, i) => i !== index));
  };
  // ─────────────────────────────────────────────────────────────────────────

  const [categories, setCategories] = useState(() => {
    const cachedCats = getCachedSync(CACHE_KEYS.categories)?.data;
    return cachedCats ? [ALL_ITEMS_CATEGORY, ...cachedCats] : [ALL_ITEMS_CATEGORY];
  });
  const [activeCategory, setActiveCategory] = useState("all");
const ALL_CATEGORY = {
  _id: "__all__",
  category: "All",
};

const [selectedCatalogCategory, setSelectedCatalogCategory] =
  useState(ALL_CATEGORY);


  const loadCategories = async ({ silent = false } = {}) => {
    try {
      const data = await fetchCategories();
      setCategories([ALL_ITEMS_CATEGORY, ...data]);
      setCached(CACHE_KEYS.categories, data);
    } catch (err) {
      console.log("CATEGORY ERROR:", err.response?.data || err.message);
    }
  };



  const handleDeleteCategory = async (category) => {
  try {
    setCategoryLoading(true);
    await deleteCategory(category._id);
    setCategoryModalVisible(false);
    setEditingCategory(null);
    await loadCategories();

    if (selectedCatalogCategory?._id === category._id) {
      setSelectedCatalogCategory({ _id: "__all__", category: "All" });
    }
  } catch (err) {
    const msg = err.response?.data?.message || "Failed to delete category.";
    Alert.alert("Can't delete category", msg);
  } finally {
    setCategoryLoading(false);
  }
};

  const filteredProducts = useMemo(() => {
    let data = [...products];

    if (activeCategory !== "all") {
      data = data.filter((p) => {
        const catId = p.category_id || p.category?._id;
        return String(catId) === String(activeCategory);
      });
    }

if (!isScanningRef.current && searchText.trim()) {
  const q = searchText.trim().toLowerCase();

  data = data.filter((p) => {
    const name = (p.product || "").toLowerCase();
    const barcode = String(p.barcode ?? "").trim().toLowerCase();

    return (
      name.includes(q) ||
      barcode.includes(q)
    );
  });
}
    return data;
  }, [products, activeCategory, searchText]);

  const navigation = useNavigation();
  const route = useRoute();
const { logout, user } = useAuth();



  const isCalculatorMode =
  user?.company?.pos_mode === "CALCULATOR";

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  const loadProducts = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoadingProducts(true);
      const data = await fetchProducts();
      setProducts(data);
      setCached(CACHE_KEYS.products, data);
    } catch (err) {
      console.log("STATUS:", err.response?.status);
      console.log("DATA:", err.response?.data);
      console.log("MESSAGE:", err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

const loadCustomers = async ({ silent = false } = {}) => {
  try {
    const data = await fetchCustomers();

    console.log("🔥 CUSTOMERS API RESPONSE:", data);
    console.log("🔥 CUSTOMER COUNT:", data?.length);

    setCustomers(data);
    setCached(CACHE_KEYS.customers, data);
  } catch (err) {
    console.log(
      "CUSTOMER ERROR:",
      err.response?.data || err.message
    );
  }
};

  // Runs every time this screen regains focus (mount, or navigating back
  // from Checkout/another screen). For each of products/customers/
  // categories: if the in-memory cache already has data (true after the
  // very first successful fetch this session — setCached above writes
  // straight into that same memory layer), skip straight to a SILENT
  // background refresh so the catalog stays on screen with no flash.
  // Only on a genuinely cold start does this fall back to the async,
  // disk-backed getCached() before deciding whether the first real fetch
  // should be silent or show a loading state.
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        // Products
        if (getCachedSync(CACHE_KEYS.products)?.data) {
          loadProducts({ silent: true });
        } else {
          const cached = await getCached(CACHE_KEYS.products);
          if (cached?.data) {
            setProducts(cached.data);
            setLoadingProducts(false);
          }
          loadProducts({ silent: !!cached?.data });
        }

        // Customers
        if (getCachedSync(CACHE_KEYS.customers)?.data) {
          loadCustomers({ silent: true });
        } else {
          const cached = await getCached(CACHE_KEYS.customers);
          if (cached?.data) {
            setCustomers(cached.data);
          }
          loadCustomers({ silent: !!cached?.data });
        }

        // Categories
        if (getCachedSync(CACHE_KEYS.categories)?.data) {
          loadCategories({ silent: true });
        } else {
          const cached = await getCached(CACHE_KEYS.categories);
          if (cached?.data) {
            setCategories([ALL_ITEMS_CATEGORY, ...cached.data]);
          }
          loadCategories({ silent: !!cached?.data });
        }
      })();
    }, [])
  );

  const handleSearchChange = (text) => {
    setSearchText(text);
  };

const handleBarcodeScan = (e) => {
  console.log("========== BARCODE INPUT ==========");
  console.log("RAW EVENT:", e);
  console.log("EVENT TYPE:", typeof e);

  let raw = "";

  if (e?.nativeEvent) {
    raw =
      e.nativeEvent.text ||
      e.nativeEvent.value ||
      "";
  }

  if (!raw && typeof e === "string") {
    raw = e;
  }

  if (!raw && typeof e === "object" && e !== null) {
    raw =
      e.data ||
      e.barcode ||
      e.text ||
      e.value ||
      e.nativeEvent?.text ||
      "";
  }

  raw = String(raw).trim();

  console.log("FINAL BARCODE:", raw);

  if (!raw) {
    console.log("❌ EMPTY BARCODE");
    return;
  }

  const [barcodeValue, qtyText] = raw.split(":");

  const barcode = String(barcodeValue || "").trim();
  const qty = Number(qtyText || 1);

  console.log("BARCODE:", barcode);
  console.log("QTY:", qty);

  const product = products.find(
    (p) =>
      String(p.barcode ?? "")
        .trim()
        .toLowerCase() === barcode.toLowerCase()
  );

  console.log(
    "MATCHED PRODUCT:",
    product
      ? {
          id: product._id || product.id,
          name: product.product,
          barcode: product.barcode,
        }
      : "NOT FOUND"
  );

  if (!product) {
    console.log("❌ Product not found for barcode:", barcode);
    setSearchText("");
    return;
  }

  if (isDuplicateScan(barcode.toLowerCase())) {
    console.log("⚠️ Ignored duplicate scan:", barcode);
    return;
  }

  console.log("✅ ADDING PRODUCT:", product.product);

  handleProductPress(product, qty);

  setSearchText("");
  isScanningRef.current = false;

  setTimeout(() => {
    searchInputRef.current?.focus();
  }, 100);
};


const handleProductPress = (product, qtyToAdd = 1) => {
  const productId = product._id || product.id;

  setCartItems((prev) => {
    const existing = prev.find(
      (i) => (i._id || i.id) === productId
    );

    if (existing) {
      return prev.map((i) =>
        (i._id || i.id) === productId
          ? { ...i, qty: i.qty + qtyToAdd }
          : i
      );
    }

    return [
      ...prev,
      {
        ...product,
        qty: qtyToAdd,
      },
    ];
  });
};



  const handleUpdateCartItem = (itemId, updates) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              qty: updates.qty,
              price: updates.price,
              description: updates.description,
            }
          : item
      )
    );
  };

  const handleOpenManageItem = (item) => {
    setManagedItem(item);
  };

  const handleCloseManageItem = () => {
    setManagedItem(null);
  };

  const handleIncrement = (item) =>
    setCartItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i))
    );

  const handleDecrement = (item) =>
    setCartItems((prev) =>
      prev
        .map((i) => (i.id === item.id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
    );

  const handleRemove = (item) =>
    setCartItems((prev) => prev.filter((i) => i.id !== item.id));

  const handleClearCart = () => setCartItems([]);

  const { subtotal } = useMemo(() => {
    const sub = cartItems.reduce((sum, i) => sum + i.qty * i.price, 0);
    return { itemsCount: cartItems.length, subtotal: sub };
  }, [cartItems]);

const discount = 0;
const tax = 0;
const grandTotal = subtotal;

  useEffect(() => {
    if (!route.params?.clearCart) return;

    const resetPOS = async () => {
      setCartItems([]);
      setSelectedCustomer(WALK_IN_CUSTOMER);

      setSidebarCollapsed(true);
      setActiveNav("cart");
      setSearchText("");
      setActiveCategory("all");

      // Post-checkout reset: the cart/customer/UI state genuinely needs to
      // clear, but the product catalog, customer list, and categories
      // almost never change as a result of placing one sale — so this
      // refresh stays SILENT (no full-pane loading flash) rather than
      // reloading loud every time a sale completes.
      await loadProducts({ silent: true });
      await loadCustomers({ silent: true });
      await loadCategories({ silent: true });

      navigation.setParams({
        clearCart: undefined,
      });
    };

    resetPOS();
  }, [route.params?.clearCart]);

useEffect(() => {
  console.log("========== INITIALIZING SUNMI SCANNER ==========");

  if (!SunmiScanner) {
    console.error("❌ SunmiScanner native module NOT FOUND");
    return;
  }

  console.log(
    "SunmiScanner methods:",
    Object.keys(SunmiScanner)
  );

  SunmiScanner.helloScanner()
    .then((res) => {
      console.log("✅ Scanner hello:", res);
    })
    .catch((err) => {
      console.error("❌ Scanner hello failed:", err);
    });

  const subscription = scannerEmitter.addListener(
    "onBarcodeScanned",
    (event) => {
      console.log("========================================");
      console.log("📡 SCANNER EVENT RECEIVED");
      console.log("EVENT:", event);
      console.log("EVENT TYPE:", typeof event);
      console.log("========================================");

      handleBarcodeScan(event);
    }
  );

  console.log("✅ Scanner event listener registered");

  return () => {
    console.log("Removing scanner listener");
    subscription.remove();
  };
}, [products]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={styles.root}>
        {/* Sidebar */}
  <Sidebar
  app={APP}
  user={user}
  activeKey={activeNav}
  onNavigate={setActiveNav}
  onSignOut={handleLogout}
  collapsed={sidebarCollapsed}
  onToggle={setSidebarCollapsed}
  onProfilePress={() => setProfileVisible(true)}
/>

        {/* Main Content */}
        <View style={styles.mainContent}>
   <View style={styles.headerWrapper}>
{activeNav !== "orders" &&
 activeNav !== "Refund" &&
 activeNav !== "categories" &&
 activeNav !== "inventory" &&
 activeNav !== "payments" &&
 activeNav !== "productForm" && (
 <Header
  
  hideSearch={isCalculatorMode}
  hideScanner={isCalculatorMode}
  screenName={activeNav}
  screenTitle=""
  onBack={handleCloseProductForm}
  sidebarCollapsed={sidebarCollapsed}
      onMenuPress={(e) => {
        setSidebarCollapsed(false);
      }}
      searchInputRef={searchInputRef}
      searchValue={searchText}
      onSearchChange={handleSearchChange}
      onSubmitEditing={handleBarcodeScan}
      onScanPress={() => {
        searchInputRef.current?.focus();
      }}
      onCustomerPress={handleOpenCustomerSearch}
      customerSelected={selectedCustomer !== WALK_IN_CUSTOMER}
      onMorePress={() => setMoreOptionsVisible(true)}
      onScreenAction={() => {
        setEditingCategory(null);
        setCategoryModalVisible(true);
      }}
      onAddProduct={() => addProductTriggerRef.current()}
      isEditingProduct={!!productFormState?.product}
      editingProductName={productFormState?.product?.product || ""}
      itemCount={activeNav === "inventory" ? products.length : 0}
      rightExtra={
        activeNav === "cart" && heldCarts.length > 0 ? (
          <TouchableOpacity
            style={styles.heldCartBtn}
            onPress={() => setHeldCartsSheetVisible(true)}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="cart-arrow-down"
              size={24}
              color={COLORS.blue}
            />
            <View style={styles.heldCountBadge}>
              <Text style={styles.heldCountText}>{heldCarts.length}</Text>
            </View>
          </TouchableOpacity>
        ) : null
      }
    />
  )}
</View>

          <View style={styles.contentWrapper}>
            {activeNav === "cart" && (
              <>
              <View style={styles.leftPane}>
  {isCalculatorMode ? (
    <CalculatorPane onAddToCart={handleAddCalculatorItem} />
  ) : (
    <OrderPane
      categories={categories}
      activeCategory={activeCategory}
      onSelectCategory={setActiveCategory}
      products={filteredProducts}
      onProductPress={handleProductPress}
    />
  )}
</View>

                <View style={styles.rightPane}>
                  <CartPanel
                    cartItems={cartItems}
                    onClearCart={handleClearCart}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                    onRemove={handleRemove}
                    onOpenManageItem={handleOpenManageItem}
                    onHoldCart={handleHoldCart}
                    customers={customers}
                    selectedCustomer={
                      selectedCustomer === WALK_IN_CUSTOMER ? null : selectedCustomer
                    }
                    onSelectCustomer={(customer) =>
                      setSelectedCustomer(customer || WALK_IN_CUSTOMER)
                    }
                    grandTotal={grandTotal}
                    checkoutDisabled={cartItems.length === 0}
                  onCheckout={() => {
  const isCreditMode =
    user?.company?.payment_mode === "CREDIT";

  if (isCreditMode && selectedCustomer !== WALK_IN_CUSTOMER) {
    navigation.navigate("CreditSummary", {
      cartItems,
      customer: selectedCustomer,
      subtotal,
      tax,
      discount,
      grandTotal,
    });
  } else {
    navigation.navigate("Checkout", {
      cartItems,
      customer: selectedCustomer,
      subtotal,
      tax,
      discount,
      grandTotal,
    });
  }
}}
                  />
                </View>
              </>
            )}

            {(activeNav === "categories" || activeNav === "inventory") && (
              <View style={styles.fullContent}>
<ProductCatalogScreen
  products={products}
  categories={categories.filter((c) => c._id !== "all")}
  refreshCategories={loadCategories}
  searchValue={searchText}
  onSearchChange={handleSearchChange}
  refreshProducts={loadProducts}
  onMenuPress={() => setSidebarCollapsed(false)}
  onOpenProductForm={handleOpenProductForm}
  registerAddProductTrigger={registerAddProductTrigger}
  selectedCategory={selectedCatalogCategory}
  onCategoryChange={setSelectedCatalogCategory}
  onAddCategory={() => {
    setEditingCategory(null);
    setCategoryModalVisible(true);
  }}
  onEditCategory={(cat) => {
    setEditingCategory(cat);
    setCategoryModalVisible(true);
  }}
/>
              </View>
            )}

            {activeNav === "productForm" && productFormState && (
              <View style={styles.fullContent}>
                <ProductFormScreen
                  product={productFormState.product}
                  categories={productFormState.categories}
                  initialCategoryId={productFormState.initialCategoryId}
                  onSave={productFormState.onSave}
                  onCancel={handleCloseProductForm}
                />
              </View>
            )}
{activeNav === "orders" && (
  <View style={styles.fullContent}>
    <OrdersScreen
      onBack={() => setActiveNav("cart")}
      onMenuPress={() => setSidebarCollapsed(false)}
    />
  </View>
)}

{activeNav === "payments" && (
  <View style={styles.fullContent}>
    <PaymentsScreen
      onMenuPress={() => setSidebarCollapsed(false)}
    />
  </View>
)}

{activeNav === "Refund" && (
  <View style={styles.fullContent}>
    <RefundsScreen
      onBack={() => setActiveNav("cart")}
      onMenuPress={() => setSidebarCollapsed(false)}
    />
  </View>
)}
          </View>
        </View>
      </View>

      <HeldCartsSheet
        visible={heldCartsSheetVisible}
        heldCarts={heldCarts}
        onRestore={handleRestoreCart}
        onDelete={handleDeleteHeldCart}
        onClose={() => setHeldCartsSheetVisible(false)}
      />

      <MoreOptionsSheet
        visible={moreOptionsVisible}
        onClose={() => setMoreOptionsVisible(false)}
        onHoldCart={handleHoldCart}
      />

<CategoryModal
  visible={categoryModalVisible}
  category={editingCategory}
  loading={categoryLoading}
  onClose={() => setCategoryModalVisible(false)}
  onDelete={editingCategory ? () => handleDeleteCategory(editingCategory) : undefined}
  onSave={async (formData) => {
    try {
      setCategoryLoading(true);
      if (editingCategory) {
        await updateCategory(editingCategory._id, formData);
      } else {
        await createCategory(formData);
      }
      setCategoryModalVisible(false);
      loadCategories();
    } finally {
      setCategoryLoading(false);
    }
  }}
/>

      <ManageCartItemModal
        visible={!!managedItem}
        item={managedItem}
        onClose={handleCloseManageItem}
        onApply={(updates) => {
          if (managedItem) {
            handleUpdateCartItem(managedItem.id, updates);
          }
          handleCloseManageItem();
        }}
      />

{/* Customer flow: one Modal, two internal screens — no close/reopen flicker */}
      <Modal
        visible={customerModalVisible}
        animationType="slide"
        onRequestClose={
          customerModalMode === "form" ? handleCloseCustomerForm : handleCloseCustomerSearch
        }
      >
        {customerModalMode === "search" ? (
          <CustomerSearchScreen
            customers={filteredCustomerResults}
            searchValue={customerSearchText}
            onSearchChange={setCustomerSearchText}
            onClose={handleCloseCustomerSearch}
            onSelectCustomer={handleSelectCustomerFromSearch}
            onAddNew={handleOpenCustomerForm}
          />
        ) : (
          <CustomerFormScreen
            values={customerFormValues}
            onChange={handleChangeCustomerForm}
            onBack={handleCloseCustomerForm}
            onSave={handleSaveCustomerForm}
            saving={savingCustomer}
            onSelectState={() => {
              // TODO: hook up a state picker; for now this is a no-op.
            }}
          />
        )}
      </Modal>

      <Modal
  visible={profileVisible}
  animationType="slide"
  onRequestClose={() => setProfileVisible(false)}
>
  <ProfileScreen
    onClose={() => setProfileVisible(false)}
  />
</Modal>
    </SafeAreaView>
    
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.navyDeep },
  root: { flex: 1, flexDirection: "row", backgroundColor: COLORS.bg },
  mainContent: { flex: 1, flexDirection: "column" },
headerWrapper: {
  backgroundColor: COLORS.bg,
},
  // Simple icon, no container/background — just the icon and its count badge.
  heldCartBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heldCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  heldCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },
contentWrapper: {
  flex: 1,
  flexDirection: "row",
},
  leftPane: {
    flex: 6,
    marginRight: SPACING.md,
  },
  rightPane: {
    flex: 4,
  },
  fullContent: { flex: 1 },
});