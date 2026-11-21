// screens/pos/POSScreen.js
import React, { useMemo, useState, useRef, useCallback } from "react";
import {
  NativeModules,
  DeviceEventEmitter,
} from "react-native";
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  Modal,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  ToastAndroid,
  Platform,
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
import QuickQtyModal from "../../components/QuickQtyModal";
import UnitPickerModal from "../../components/UnitPickerModal";
import { getUnitOptions, getDefaultUnit, getListPrice } from "../../utils/unitOptions";
import { WALK_IN_CUSTOMER } from "../../components/CustomerSelector";
import CustomerSearchScreen from "../Customer/CustomerSearchScreen";
import CustomerFormScreen from "../Customer/CustomerFormScreen";
import CustomerPaymentModal from "../../components/CustomerPaymentModal";
import { COLORS, SPACING, RADIUS } from "../../components/Colors";
import { createPayment } from "../../api/payment";
import { updateSale } from "../../api/sale";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import {
  createCustomerReturn,
  fetchCustomerReturns,
} from "../../api/customerReturn";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useEffect } from "react";
import {
  fetchProducts,
  createProduct,
} from "../../api/product";
import {
  fetchCustomers,
  createCustomer,
    updateCustomer,
  fetchCustomerInvoices,
  fetchCustomerPayments,
} from "../../api/customer";

import { printCustomerLedger } from "../../services/printer";


import ProductCatalogScreen from "../ProductCatalog/ProductCatalogScreen";
import ProductFormScreen from "../ProductCatalog/ProductFormScreen";
import ManageCartItemModal from "../../components/ManageCartItemModal";
import RefundsScreen from "../Refunds/RefundsScreen";
import OrdersScreen from "../Orders/OrdersScreen";
import PaymentsScreen from "../Payment/PaymentsScreen";
import CustomerListScreen from "../Customer/CustomerListScreen";
import CustomerAccountScreen from "../Customer/CustomerAccountScreen";
import InactiveCustomersScreen from "../Customer/InactiveCustomersScreen";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CategoryModal from "../../components/CategoryModal";
import CalculatorPane from "../../components/CalculatorPane";
import ProfileScreen from "../Profile/ProfileScreen";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../api/category";
import { getCached, setCached, getCachedSync } from "../../utils/cache";

const { SunmiScanner } = NativeModules;
const scannerEmitter = DeviceEventEmitter;
const APP = { name: "D'LumeBiz", registerType: "Default Register" };


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
  const { logout, user } = useAuth();

const companyId =
  user?.company?._id ||
  user?.company_id ||
  user?.companyId ||
  null;

  const [activeNav, setActiveNav] = useState("cart");
  const [selectedCustomerAccount, setSelectedCustomerAccount] = useState(null);
  const [paymentCustomer, setPaymentCustomer] = useState(null);

const [paymentLoading, setPaymentLoading] = useState(false);
const [paymentFetching, setPaymentFetching] = useState(false);
const [customerPaymentResult, setCustomerPaymentResult] = useState(null);
  const [profileVisible, setProfileVisible] = useState(false);
const [searchText, setSearchText] = useState(""); // POS dashboard search
const [catalogSearchText, setCatalogSearchText] = useState(""); // Products list search
const [cartItems, setCartItems] = useState([]);
const [isReturnMode, setIsReturnMode] = useState(false);

// Invoice currently being edited
const [editingInvoice, setEditingInvoice] = useState(null);
  
const [transportModalVisible, setTransportModalVisible] = useState(false);
const [transportationDetails, setTransportationDetails] = useState("");
const [transportationInput, setTransportationInput] = useState("");



const toYMD = (date) => {
  const d = new Date(date);

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const [saleDate, setSaleDate] = useState(
  () => toYMD(new Date())
);

const [showDatePicker, setShowDatePicker] = useState(false);

const handleDateChange = (event, selected) => {
  setShowDatePicker(false);

  if (event?.type === "dismissed" || !selected) return;

  // Store date consistently as YYYY-MM-DD
  setSaleDate(toYMD(selected));
};

const saleDateLabel = saleDate
  ? new Date(`${saleDate}T12:00:00`).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    )
  : null;


const [returnCartItems, setReturnCartItems] = useState([]);
const [returnSelectedCustomer, setReturnSelectedCustomer] =
  useState(WALK_IN_CUSTOMER);
const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [managedItem, setManagedItem] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(WALK_IN_CUSTOMER);
const [customerListSearch, setCustomerListSearch] = useState("");
const [showInactiveCustomersPage, setShowInactiveCustomersPage] =
  useState(false);
const [editingCustomer, setEditingCustomer] = useState(null); // null = add mode
const [accountRefreshKey, setAccountRefreshKey] = useState(0);
const [transportationFocused, setTransportationFocused] = useState(false);

const handleAddCalculatorItem = (item) => {
  if (isReturnMode) {


    setReturnCartItems((prev) => [...prev, item]);
    return;
  }

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

  const totalOutstanding = useMemo(() => {
  return customers.reduce((total, customer) => {
    const amount = Number(customer?.outstanding || 0);

    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}, [customers]);

    const activeCustomers = useMemo(
    () => customers.filter((c) => c.is_active !== false),
    [customers]
  );



  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

// ── Customer search / add ────────────────────────────────────────────────
const [customerModalVisible, setCustomerModalVisible] = useState(false);
const [customerModalMode, setCustomerModalMode] = useState("search");
const [customerSearchText, setCustomerSearchText] = useState("");
const [customerFormValues, setCustomerFormValues] = useState({});
const [savingCustomer, setSavingCustomer] = useState(false);
const [customerFormFromList, setCustomerFormFromList] = useState(false);

const [paymentSaleId, setPaymentSaleId] = useState(null);

const filteredCustomerResults = useMemo(() => {
  const q = customerSearchText.trim().toLowerCase();

  return customers
    .filter((c) => {
      if (c.is_active === false) return false;
      if (!q) return true;

      const name = String(
        c.customer_name ||
        c.name ||
        `${c.first_name || ""} ${c.last_name || ""}`
      ).toLowerCase();

      const company = String(
        c.company_name ||
        c.companyName ||
        c.company ||
        ""
      ).toLowerCase();

      const phone = String(
        c.contact_no_1 ||
        c.phone ||
        c.mobile ||
        ""
      ).toLowerCase();

      return (
        name.includes(q) ||
        company.includes(q) ||
        phone.includes(q)
      );
    })
    .map((c) => ({
      id: c._id || c.id,
      name:
        c.customer_name ||
        c.name ||
        `${c.first_name || ""} ${c.last_name || ""}`.trim(),
      phone: c.contact_no_1 || c.phone || c.mobile || "",
      company_name: c.company_name || c.companyName || c.company || "",
      is_active: c.is_active,
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
  const selected = customer._raw || customer;

  if (isReturnMode) {
    setReturnSelectedCustomer(selected);
  } else {
    setSelectedCustomer(selected);
  }

  setCustomerModalVisible(false);
};


const handleOpenCustomerForm = (fromList = false) => {
  setEditingCustomer(null);
  setCustomerFormValues({});
  setCustomerFormFromList(fromList);
  setCustomerModalMode("form");
  setCustomerModalVisible(true);
};
// "Back" from the form now returns to search, rather than closing everything.
const handleCloseCustomerForm = () => {
  if (customerFormFromList) {
    setCustomerModalVisible(false);
    setCustomerFormFromList(false);
    setEditingCustomer(null);
    return;
  }

  setCustomerModalMode("search");
};

const toFormValues = (c) => ({
  name:
    c.customer_name ||
    `${c.first_name || ""} ${c.last_name || ""}`.trim(),
  company_name: c.company_name || "",
  mobile: c.contact_no_1 || "",
  email: c.email || "",
  opening_balance: String(c.opening_balance ?? ""),
  address1: c.address_line_1 || "",
  address2: c.address_line_2 || "",
  city: c.city || "",
  state: c.state || "",
  pincode: c.pincode || "",
});

const buildCustomerPayload = (v) => {
  const fullName = (v.name || "").trim();
  const parts = fullName.split(/\s+/);
  return {
    first_name: parts[0] || "",
    last_name: parts.slice(1).join(" "),
    company_name: v.company_name || "",
    contact_no_1: v.mobile || "",
    email: v.email || "",
    address_line_1: v.address1 || "",
    address_line_2: v.address2 || "",
    city: v.city || "",
    state: v.state || "",
    pincode: v.pincode || "",
    opening_balance: Number(v.opening_balance || 0),
  };
};

const handleOpenEditCustomer = (customer) => {
  setEditingCustomer(customer);
  setCustomerFormValues(toFormValues(customer));
  setCustomerFormFromList(true); // back closes the modal
  setCustomerModalMode("form");
  setCustomerModalVisible(true);
};


const handleChangeCustomerForm = (field, text) =>
  setCustomerFormValues((prev) => ({ ...prev, [field]: text }));

const handleSaveCustomerForm = async () => {
  try {
    setSavingCustomer(true);
    const payload = buildCustomerPayload(customerFormValues);

    // ── EDIT ──
    if (editingCustomer) {
      const id = editingCustomer._id || editingCustomer.id;
const res = await updateCustomer(id, payload);
      const updated = res?.data?.data || res?.data || {};

setSelectedCustomerAccount((prev) => ({
  ...(prev || editingCustomer),
  ...payload,
  customer_name: (customerFormValues.name || "").trim(),
  ...updated,
}));
      setAccountRefreshKey((k) => k + 1);
      await loadCustomers({ silent: true });

      setEditingCustomer(null);
      setCustomerModalVisible(false);
      return;
    }

    // ── ADD ──
    const created = await createCustomer(payload);

    const newCustomer =
      created?.data?.data ||
      created?.data ||
      created;

    if (isReturnMode) {
      setReturnSelectedCustomer(newCustomer);
    } else {
      setSelectedCustomer(newCustomer);
    }

    await loadCustomers({ silent: true });
    setCustomerModalVisible(false);
  } catch (err) {
    console.log("CUSTOMER SAVE ERROR:", err.response?.data || err.message);
    Alert.alert(
      "Save Failed",
      err?.response?.data?.message || "Unable to save customer."
    );
  } finally {
    setSavingCustomer(false);
  }
};


const handleToggleCustomerActive = async () => {
  if (!editingCustomer) return;
  const id = editingCustomer._id || editingCustomer.id;
  const nextActive = editingCustomer.is_active === false; // inactive → active, else → inactive

  try {
    await updateCustomer(id, { is_active: nextActive });

    setSelectedCustomerAccount((prev) =>
      prev ? { ...prev, is_active: nextActive } : prev
    );
    setAccountRefreshKey((k) => k + 1);

    if (!nextActive) {
      const sameId = (c) => c && (c._id || c.id) === id;
      if (sameId(selectedCustomer)) setSelectedCustomer(WALK_IN_CUSTOMER);
      if (sameId(returnSelectedCustomer)) setReturnSelectedCustomer(WALK_IN_CUSTOMER);
    }

    await loadCustomers({ silent: true });
    setEditingCustomer(null);
    setCustomerModalVisible(false);
  } catch (err) {
    Alert.alert(
      "Failed",
      err?.response?.data?.message || "Unable to update customer status."
    );
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

  
// ── Held Carts: isolated by company ──────────────────────────────
const [heldCarts, setHeldCarts] = useState([]);
const [heldCartsLoaded, setHeldCartsLoaded] = useState(false);
const [heldCartsCompanyId, setHeldCartsCompanyId] = useState(null);

const [heldCartsSheetVisible, setHeldCartsSheetVisible] =
  useState(false);

const heldCartsStorageKey = companyId
  ? `pos:held-carts:v1:${companyId}`
  : null;

// Load carts whenever the active company changes.
useEffect(() => {
  let cancelled = false;

  const loadHeldCarts = async () => {
    setHeldCartsLoaded(false);
    setHeldCartsCompanyId(null);
    setHeldCarts([]);
    setHeldCartsSheetVisible(false);

    if (!companyId || !heldCartsStorageKey) {
      return;
    }

    try {
      const saved = await AsyncStorage.getItem(
        heldCartsStorageKey
      );

      if (cancelled) return;

      const parsed = saved ? JSON.parse(saved) : [];

      setHeldCarts(Array.isArray(parsed) ? parsed : []);
      setHeldCartsCompanyId(companyId);
    } catch (error) {
      if (cancelled) return;

      console.log("LOAD HELD CARTS ERROR:", error);
      setHeldCarts([]);
      setHeldCartsCompanyId(companyId);
    } finally {
      if (!cancelled) {
        setHeldCartsLoaded(true);
      }
    }
  };

  loadHeldCarts();

  return () => {
    cancelled = true;
  };
}, [companyId]);

// Save only after the correct company's carts have loaded.
useEffect(() => {
  if (
    !companyId ||
    !heldCartsStorageKey ||
    !heldCartsLoaded ||
    heldCartsCompanyId !== companyId
  ) {
    return;
  }

  AsyncStorage.setItem(
    heldCartsStorageKey,
    JSON.stringify(heldCarts)
  ).catch((error) => {
    console.log("SAVE HELD CARTS ERROR:", error);
  });
}, [
  companyId,
  heldCartsStorageKey,
  heldCarts,
  heldCartsLoaded,
  heldCartsCompanyId,
]);

  // ── More Options (Hold Cart) ─────────────────────────────────────────────

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

  const requestHoldCart = () => {
  if (isReturnMode) {
    Alert.alert("Not available", "Carts can't be held while in Return mode.");
    return;
  }

  if (cartItems.length === 0) {
    Alert.alert("Cart is empty", "Add items to the cart before holding it.");
    return;
  }

  const customerName =
    selectedCustomer === WALK_IN_CUSTOMER
      ? "Walk-in Customer"
      : selectedCustomer?.customer_name ||
        `${selectedCustomer?.first_name || ""} ${selectedCustomer?.last_name || ""}`.trim() ||
        selectedCustomer?.company_name ||
        "Customer";

  Alert.alert(
    "Hold this cart?",
    `${cartItems.length} ${cartItems.length === 1 ? "item" : "items"} for ${customerName} will be put on hold and the cart will be cleared.`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Hold", onPress: handleHoldCart },
    ]
  );
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
  // Dashboard should show ACTIVE products only
  let data = products.filter((p) => p.is_active !== false);

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

      return name.includes(q) || barcode.includes(q);
    });
  }

  return data;
}, [products, activeCategory, searchText]);

  const navigation = useNavigation();
  const route = useRoute();


const editInvoice = editingInvoice || route.params?.editInvoice || null;
const isEditMode = !!editInvoice;

const handleEditInvoice = (invoice) => {
  const invoiceId = invoice?._id || invoice?.id || invoice?.sale_id;

  if (!invoiceId) {
    Alert.alert("Error", "Invoice ID not found.");
    return;
  }



  setEditingInvoice(invoice);
  setActiveNav("cart");
};



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



const handleAddProductFromPOS = () => {
  const productCategories = categories.filter(
    (category) => category._id !== "all"
  );

  handleOpenProductForm({
    product: null,
    categories: productCategories,
    initialCategoryId:
      activeCategory === "all" ? "" : activeCategory,

    // Show only the quick-add fields in POS
    posQuickAdd: true,

    onSave: async (formData) => {
      await createProduct(formData);
      await loadProducts({ silent: true });
    },
  });
};


const loadCustomers = async ({ silent = false } = {}) => {
  try {
 const data = await fetchCustomers();

console.log(
  "🔥 CUSTOMERS FROM BACKEND:",
  JSON.stringify(data, null, 2)
);

setCustomers(data);
    setCached(CACHE_KEYS.customers, data);
  } catch (err) {
    console.log(
      "CUSTOMER ERROR:",
      err.response?.data || err.message
    );
  }
};


const handleCustomerPay = async (customer) => {
  const customerId = customer?._id || customer?.id;

  if (!customerId) {
    Alert.alert("Error", "Customer ID not found.");
    return;
  }

  // Customer-list payments must not target a specific invoice.
  // Backend allocates opening balance first, then oldest invoice.
  setPaymentSaleId(null);
  setPaymentCustomer(customer);
  setPaymentFetching(true);

  try {
    // Keep fetching invoices to preserve the existing loading flow.
    await fetchCustomerInvoices(customerId);
  } catch (error) {
    console.log(
      "CUSTOMER PAYMENT LOAD ERROR:",
      error?.response?.data || error?.message
    );

    Alert.alert(
      "Error",
      error?.response?.data?.message ||
        "Unable to load customer outstanding."
    );

    setPaymentCustomer(null);
    setPaymentSaleId(null);
  } finally {
    setPaymentFetching(false);
  }
};



const getInvoicePayableAmount = (invoice) => {
  const numberOrNull = (value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  // Prefer fields that already contain the final payable amount.
  const payableFields = [
    "payable_total",
    "grand_total",
    "total_after_discount",
    "net_amount",
  ];

  for (const field of payableFields) {
    const value = numberOrNull(invoice?.[field]);

    if (value !== null) {
      return Math.max(0, value);
    }
  }

  // Otherwise calculate subtotal minus discount.
  const subtotal = numberOrNull(invoice?.subtotal)
    ?? numberOrNull(invoice?.total_amount)
    ?? numberOrNull(invoice?.total)
    ?? 0;

  const discount =
    numberOrNull(invoice?.discount_amount)
    ?? numberOrNull(invoice?.discountAmount)
    ?? numberOrNull(invoice?.discount)
    ?? 0;

  return Math.max(0, subtotal - discount);
};


const handlePrintOutstandingReport = async (reportCustomers = []) => {
  try {
    if (!Array.isArray(reportCustomers)) {
      throw new Error("Invalid customer list.");
    }

    const company = user?.company || {};

    const companyName =
      company?.name ||
      company?.company_name ||
      user?.company_name ||
      "D'LumeBiz";

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const money = (value) =>
      "₹" +
      Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const getCustomerName = (customer) =>
      (
        customer.customer_name ||
        `${customer.first_name || ""} ${customer.last_name || ""}`
      ).trim() || "Unnamed Customer";

    const getOutstanding = (customer) => {
      const amount = Number(
        customer?.outstanding ??
        customer?.remaining_outstanding ??
        0
      );

      return Number.isFinite(amount) ? amount : 0;
    };

    const totalOutstanding = reportCustomers.reduce(
      (total, customer) => total + getOutstanding(customer),
      0
    );

    const rows = reportCustomers.map((customer, index) => {
      const inactive = customer?.is_active === false;

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(getCustomerName(customer))}</td>
          <td>${escapeHtml(
            customer.company_name || customer.company || "—"
          )}</td>
          <td>${escapeHtml(customer.contact_no_1 || "—")}</td>
        
          <td class="amount">${money(getOutstanding(customer))}</td>
        </tr>
      `;
    }).join("");

    const reportDate = new Date().toLocaleDateString("en-IN");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />

        <style>
          @page {
            size: A4 landscape;
            margin: 25px;
          }

          body {
            font-family: Arial, sans-serif;
            color: #1E293B;
            padding: 10px;
          }

          .header {
            text-align: center;
            margin-bottom: 25px;
          }

          .company {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 6px;
          }

          .title {
            font-size: 17px;
            font-weight: bold;
            margin-bottom: 6px;
          }

          .date {
            font-size: 11px;
            color: #64748B;
          }

       table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: 20px;
}

th, td {
  padding: 10px 8px;
  border: 1px solid #CBD5E1;
  font-size: 11px;
  text-align: left;
  vertical-align: middle;
  overflow-wrap: break-word;
}

th {
  background: #F1F5F9;
  color: #1E2A3A;
  font-weight: bold;
}

th:nth-child(1), td:nth-child(1) {
  width: 7%;
  text-align: center;
}

th:nth-child(2), td:nth-child(2) {
  width: 27%;
}

th:nth-child(3), td:nth-child(3) {
  width: 22%;
}

th:nth-child(4), td:nth-child(4) {
  width: 20%;
}

th:nth-child(5), td:nth-child(5) {
  width: 24%;
  text-align: left;
}

.amount {
  text-align: left;
  font-weight: bold;
  white-space: nowrap;
}

.total-row td {
  background: #F1F5F9;
  font-weight: bold;
  font-size: 13px;
  border-top: 2px solid #CBD5E1;
}

          .footer {
            margin-top: 25px;
            text-align: right;
            font-size: 10px;
            color: #64748B;
          }
        </style>
      </head>

      <body>

        <div class="header">
          <div class="company">
            ${escapeHtml(companyName)}
          </div>

          <div class="title">
            CUSTOMER OUTSTANDING REPORT
          </div>

          <div class="date">
            Report Date: ${reportDate}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Customer Name</th>
              <th>Company</th>
              <th>Mobile Number</th>
              <th>Outstanding (₹)</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows ||
            `<tr><td colspan="5" style="text-align:center">
                No customers found
              </td></tr>`
            }
          </tbody>

          <tfoot>
            <tr class="total-row">
     <td colspan="4" style="text-align:left">
  TOTAL OUTSTANDING
</td>
<td class="amount" style="text-align:left">
  ${money(totalOutstanding)}
</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          Total Customers: ${reportCustomers.length}
        </div>

      </body>
      </html>
    `;

    console.log("CUSTOMER OUTSTANDING REPORT:", {
      customers: reportCustomers.length,
      totalOutstanding,
    });

    const file = await Print.printToFileAsync({
      html,
      base64: false,
    });

    if (!file?.uri) {
      throw new Error("PDF generation failed.");
    }

    const safeCompanyName = companyName
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const pdfUri =
      `${FileSystem.cacheDirectory}${safeCompanyName}_Outstanding_Report_${Date.now()}.pdf`;

    await FileSystem.copyAsync({
      from: file.uri,
      to: pdfUri,
    });

    const canShare = await Sharing.isAvailableAsync();

    if (!canShare) {
      Alert.alert(
        "PDF Created",
        "PDF was generated, but sharing is unavailable on this device."
      );
      return;
    }

    await Sharing.shareAsync(pdfUri, {
      mimeType: "application/pdf",
      dialogTitle: "Customer Outstanding Report",
      UTI: "com.adobe.pdf",
    });

  } catch (error) {
    console.log("OUTSTANDING REPORT PDF ERROR:", error);

    Alert.alert(
      "PDF Failed",
      error?.message || "Unable to generate outstanding report."
    );
  }
};


const handlePrintCustomerSummary = async (customer, range) => {
  try {
    const customerId = customer?._id || customer?.id;

    if (!customerId) {
      Alert.alert("Print Error", "Customer ID not found.");
      return;
    }

    console.log("====================================");
    console.log("🖨️ CUSTOMER SUMMARY PRINT");
    console.log("CUSTOMER:", customer);
    console.log("RANGE:", range);
    console.log("====================================");

    // Fetch latest sales + payments

const [invoiceResponse, paymentResponse, returnResponse] =
  await Promise.all([
    fetchCustomerInvoices(customerId),
    fetchCustomerPayments(customerId),
    fetchCustomerReturns(customerId),
  ]);

    const invoices =
      invoiceResponse?.data?.data ||
      invoiceResponse?.data ||
      [];

    const payments =
      paymentResponse?.data?.data ||
      paymentResponse?.data ||
      [];

      
const returns =
  returnResponse?.data?.data ??
  returnResponse?.data ??
  [];


    const from = range?.from ? new Date(range.from) : null;
    const to = range?.to ? new Date(range.to) : new Date();

    // Compare by local calendar date
 const getDate = (item) =>
  new Date(
    item?.createdAt ||
      item?.created_at ||
      item?.createdOn ||
      item?.invoice_date ||
      item?.payment_date ||
      item?.order_date ||
      item?.date ||
      0
  );

    const isInRange = (item) => {
      const date = getDate(item);

      if (isNaN(date.getTime())) return false;

      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);

        if (date < fromDate) return false;
      }

      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        if (date > toDate) return false;
      }

      return true;
    };

    const filteredInvoices = (Array.isArray(invoices) ? invoices : [])
      .filter(isInRange);

    const filteredPayments = (Array.isArray(payments) ? payments : [])
      .filter(isInRange);

    // Convert to printable ledger rows

const invoiceRows = filteredInvoices.map((invoice) => {
  const discount = Number(
    invoice.discount_amount ??
    invoice.discountAmount ??
    invoice.discount ??
    0
  );

  return {
    date: getDate(invoice).toLocaleDateString("en-GB"),
    kind: "invoice",
    title: invoice.invoice_no || invoice.invoiceNo || "Invoice",
    note: discount > 0 ? `Discount: ₹${discount.toLocaleString("en-IN")}` : "",
    amount: getInvoicePayableAmount(invoice),

    lines: Array.isArray(invoice.items)
      ? invoice.items.map((item) => ({
          qty: Number(item?.qty ?? item?.quantity ?? 0),
          rate: Number(
            item?.rate ??
            item?.price ??
            item?.selling_price ??
            item?.unit_price ??
            0
          ),
          amount: Number(item?.amount ?? 0),
        }))
      : [],

    sortDate: getDate(invoice).getTime(),
  };
});

console.log(
  "🔥🔥🔥 INVOICE ITEMS BEFORE PRINT:",
  JSON.stringify(
    invoiceRows.map((r) => ({
      title: r.title,
      amount: r.amount,
      lines: r.lines,
      firstLine: r.lines?.[0] || null,
    })),
    null,
    2
  )
);

    const paymentRows = filteredPayments.map((payment) => ({
      date: getDate(payment).toLocaleDateString("en-GB"),
      kind: "payment",
      title: `Payment${
        payment.payment_method
          ? ` • ${payment.payment_method}`
          : ""
      }`,
      note: payment.remarks || payment.note || "",
      amount: Number(payment.amount || 0),
      sortDate: getDate(payment).getTime(),
    }));



const filteredReturns = (Array.isArray(returns) ? returns : [])
  .filter(isInRange);

const returnRows = filteredReturns.map((item) => ({
  date: getDate(item).toLocaleDateString("en-GB"),
  kind: "return",
  title: item.return_no || item.returnNo || "Customer Return",
  note: item.description || "Return",
  amount: Number(
    item.total_amount ??
    item.totalAmount ??
    item.amount ??
    0
  ),
  sortDate: getDate(item).getTime(),
}));



const rows = [
  ...invoiceRows,
  ...paymentRows,
  ...returnRows,
]
  .sort((a, b) => a.sortDate - b.sortDate)
  .map(({ sortDate, ...row }) => row);


    const totalInvoiced = invoiceRows.reduce(
      (sum, row) => sum + row.amount,
      0
    );


const totalReceived = [...paymentRows, ...returnRows].reduce(
  (sum, row) => sum + row.amount,
  0
);


    const customerName =
      customer?.customer_name ||
      customer?.name ||
      `${customer?.first_name || ""} ${
        customer?.last_name || ""
      }`.trim() ||
      "Customer";

    const periodLabel =
      range?.label || "All dates";

const originalOpeningBalance = Number(
  customer?.opening_balance ??
    customer?.openingBalance ??
    0
);


const broughtForwardTransactions = [
  ...(Array.isArray(invoices) ? invoices : []).map((invoice) => ({
    date: getDate(invoice),
    kind: "invoice",
amount: getInvoicePayableAmount(invoice),
  })),
  ...(Array.isArray(payments) ? payments : []).map((payment) => ({
    date: getDate(payment),
    kind: "payment",
    amount: Number(payment.amount || 0),
  })),
  
...(Array.isArray(returns) ? returns : []).map((item) => ({
  date: getDate(item),
  kind: "return",
  amount: Number(
    item.total_amount ??
    item.totalAmount ??
    item.amount ??
    0
  ),
})),

].filter((row) => {
  if (!from) return false;

  const startDate = new Date(from);
  startDate.setHours(0, 0, 0, 0);

  return (
    !Number.isNaN(row.date.getTime()) &&
    row.date < startDate
  );
});

const openingBalance = broughtForwardTransactions.reduce(
(balance, row) =>
  balance +
  (row.kind === "invoice" ? row.amount : -row.amount),
  originalOpeningBalance
);


    // Backend-calculated/current outstanding
    const outstanding = Number(
      customer?.outstanding ??
        customer?.remaining_outstanding ??
        0
    );

    const printPayload = {
      customer: {
        name: customerName,
        company: customer?.company_name || "",
        phone: customer?.contact_no_1 || "",
      },

      period: periodLabel,

      openingBalance,

      rows,

      totalInvoiced,

      totalReceived,

      outstanding,
    };

    console.log("🖨️ CUSTOMER LEDGER PAYLOAD:");
    console.log(
      JSON.stringify(printPayload, null, 2)
    );

    if (rows.length === 0 && openingBalance === 0) {
      Alert.alert(
        "Nothing to Print",
        `No transactions found for ${periodLabel}.`
      );
      return;
    }

    const result = await printCustomerLedger(
      printPayload
    );

    console.log(
      "🖨️ CUSTOMER LEDGER PRINT RESULT:",
      result
    );

    if (!result?.success) {
      throw result?.error ||
        new Error("Unable to print customer ledger.");
    }

    Alert.alert(
      "Print Successful",
      `${customerName}'s account ledger printed successfully.`
    );
  } catch (error) {
    console.log(
      "❌ CUSTOMER SUMMARY PRINT ERROR:",
      error?.response?.data ||
        error?.message ||
        error
    );

    Alert.alert(
      "Print Failed",
      error?.message ||
        "Unable to print customer account."
    );
  }
};




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



const editInvoiceLoadedRef = useRef(null);

useEffect(() => {
  if (!editInvoice) {
    editInvoiceLoadedRef.current = null;
    return;
  }

  const invoiceId =
    editInvoice._id ||
    editInvoice.id ||
    editInvoice.sale_id;

  if (!invoiceId) {
    console.log("EDIT INVOICE: Invoice ID missing", editInvoice);
    return;
  }

  // Do not load the same invoice into the cart repeatedly.
  if (editInvoiceLoadedRef.current === String(invoiceId)) {
    return;
  }

  const invoiceItems = Array.isArray(editInvoice.items)
    ? editInvoice.items
    : [];

  if (invoiceItems.length === 0) {
    console.log("EDIT INVOICE: No items found", editInvoice);
    return;
  }

  const customerValue =
    editInvoice.customer_id ||
    editInvoice.customer ||
    editInvoice.customerId;

  const customerId =
    typeof customerValue === "object"
      ? customerValue?._id || customerValue?.id
      : customerValue;

  const matchedCustomer = customers.find(
    (customer) =>
      String(customer._id || customer.id) === String(customerId)
  );

const prefilledItems = invoiceItems.map((item, index) => {
  const productId =
    item.product_id?._id ||
    item.product_id ||
    item.product?._id ||
    item.product?.id ||
    item._id ||
    item.id;

  const matchedProduct = products.find(
    (product) =>
      String(product._id || product.id) === String(productId)
  );

  const bags = Number(
    item.bags ??
    item.bag ??
    item.bag_count ??
    item.no_of_bags ??
    0
  );

  const units = Number(
    item.units_per_bag ??
    item.unitsPerBag ??
    item.unit_per_bag ??
    item.units ??
    item.unit ??
    0
  );

  const qty = Number(
    item.qty ??
    item.quantity ??
    (bags > 0 && units > 0 ? bags * units : 1)
  );

  const price = Number(
    item.price ??
    item.rate ??
    item.selling_price ??
    item.unit_price ??
    0
  );

  return {
    ...(matchedProduct || {}),
    ...item,

    _id: matchedProduct?._id || productId || `edit-item-${index}`,
    id: matchedProduct?.id || productId || `edit-item-${index}`,

    product:
      item.product_name ||
      item.product?.product ||
      item.product ||
      matchedProduct?.product ||
      item.description ||
      item.name ||
      "Item",

    description: item.description || "",

    qty,
    price,

    bags: bags > 0 ? bags : null,
    units_per_bag: units > 0 ? units : null,
  };
});

  setCartItems(prefilledItems);
  setSelectedCustomer(matchedCustomer || customerValue || WALK_IN_CUSTOMER);

  const invoiceDate =
    editInvoice.invoice_date ||
    editInvoice.sale_date ||
    editInvoice.createdAt ||
    editInvoice.created_at ||
    editInvoice.date;

  if (invoiceDate) {
    const parsedDate = new Date(invoiceDate);

    if (!Number.isNaN(parsedDate.getTime())) {
      setSaleDate(toYMD(parsedDate));
    }
  }

  setTransportationDetails(
    editInvoice.transportationDetails ||
    editInvoice.transportation_details ||
    ""
  );

  setTransportationInput(
    editInvoice.transportationDetails ||
    editInvoice.transportation_details ||
    ""
  );

  setIsReturnMode(false);
  setActiveNav("cart");
  setSearchText("");
  setActiveCategory("all");

  editInvoiceLoadedRef.current = String(invoiceId);

  console.log("EDIT INVOICE: Prefilled POS cart", prefilledItems);
}, [editInvoice, products, customers]);


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
  const updateCart = isReturnMode
    ? setReturnCartItems
    : setCartItems;

  const savedUnits = Number(unitsMap[productId]);
  const units =
    savedUnits > 0
      ? savedUnits
      : getDefaultUnit(getUnitOptions(product));

  updateCart((prev) => {
    const existing = prev.find(
      (item) => (item._id || item.id) === productId
    );

    if (existing) {
      return prev.map((item) =>
        (item._id || item.id) === productId
          ? {
              ...item,
              qty: (Number(item.qty) || 0) + qtyToAdd,
            }
          : item
      );
    }

    return [
      ...prev,
      {
        ...product,
        qty: qtyToAdd,
        bags: null,
        units_per_bag: null,
      },
    ];
  });
};


const [quickAddProduct, setQuickAddProduct] = useState(null);
const [quickPrefillUnits, setQuickPrefillUnits] = useState(null);
const [pickerProduct, setPickerProduct] = useState(null); // long-press chips
const [unitsMap, setUnitsMap] = useState({});
const unitsStorageKey = companyId ? `pos:units-per-bag:v1:${companyId}` : null;

useEffect(() => {
  if (!unitsStorageKey) {
    setUnitsMap({});
    return;
  }
  let cancelled = false;
  AsyncStorage.getItem(unitsStorageKey)
    .then((s) => {
      if (!cancelled) setUnitsMap(s ? JSON.parse(s) : {});
    })
    .catch(() => {});
  return () => {
    cancelled = true;
  };
}, [unitsStorageKey]);

const openEntry = (product, units = null) => {
  setQuickPrefillUnits(units);
  setQuickAddProduct(product);
};

const closeEntry = () => {
  setQuickAddProduct(null);
  setQuickPrefillUnits(null);
};

// Your existing cart logic, unchanged, now taking the product as an argument.
const addQuickItem = (product, { bags = 1, units, price }) => {
  const productId = product._id || product.id;
  const selectedUnits = Number(units);
  const addedBags = Number(bags) || 1;
  const finalPrice = Number(price) || 0;

  console.log("🟢 ADD QUICK ITEM:", {
  productName: product.product,
  productId,
  bags: addedBags,
  units: selectedUnits,
});

  if (!selectedUnits || selectedUnits <= 0) {
    console.log("INVALID SELECTED UNIT:", units);
    return;
  }

  const updateCart = isReturnMode ? setReturnCartItems : setCartItems;

  updateCart((prev) => {
    const existing = prev.find(
      (item) =>
        String(item._id || item.id) === String(productId)
    );


    console.log("🟡 EXISTING ITEM:", existing
  ? {
      product: existing.product,
      id: existing._id || existing.id,
      qty: existing.qty,
      bags: existing.bags,
      units_per_bag: existing.units_per_bag,
    }
  : "NEW PRODUCT"
);

    if (existing) {
      // Recover the previous bag count if it was lost.
      const previousUnit =
        Number(existing.units_per_bag) ||
        Number(unitsMap[productId]) ||
        getDefaultUnit(getUnitOptions(product));

      const previousBags =
        Number(existing.bags) > 0
          ? Number(existing.bags)
          : previousUnit > 0
            ? Math.round((Number(existing.qty) || 0) / previousUnit)
            : 0;

      const totalBags = previousBags + addedBags;

      return prev.map((item) =>
        String(item._id || item.id) === String(productId)
          ? {
              ...item,
              bags: totalBags,
              units_per_bag: selectedUnits,
              qty: totalBags * selectedUnits,
              price: finalPrice,
            }
          : item
      );
    }

    return [
      ...prev,
      {
        ...product,
        price: finalPrice,
        bags: addedBags,
        units_per_bag: selectedUnits,
        qty: addedBags * selectedUnits,
      },
    ];
  });

  if (unitsStorageKey) {
    const next = {
      ...unitsMap,
      [productId]: selectedUnits,
    };

    setUnitsMap(next);
    AsyncStorage.setItem(
      unitsStorageKey,
      JSON.stringify(next)
    ).catch(console.log);
  }
};
// Called by the full entry modal
const handleQuickAdd = (entry) => {
  if (!quickAddProduct) return;
  addQuickItem(quickAddProduct, entry);
  closeEntry();
};

// TAP: 1 bag × 120 units at the list price (opens the modal only if no price)
const handleProductTap = (product) => {
  const productId = product._id || product.id;
  const price = getListPrice(product);

  // Use the last selected unit, otherwise use the default unit.
  const savedUnits = unitsMap[productId];

  const units =
    Number(savedUnits) > 0
      ? Number(savedUnits)
      : getDefaultUnit(getUnitOptions(product));

  if (price > 0) {
    addQuickItem(product, {
      bags: 1,
      units,
      price,
    });
  } else {
    openEntry(product, units);
  }
};

// HOLD: chips in the middle of the screen
const handleProductLongPress = (product) => setPickerProduct(product);

const handlePickUnit = (units) => {
  const product = pickerProduct;
  setPickerProduct(null);

  if (!product) return;

  const price = getListPrice(product);

  // Directly add 1 bag with the selected units
  addQuickItem(product, {
    bags: 1,
    units,
    price: price || 0,
  });
};

const handlePickOther = () => {
  const product = pickerProduct;
  setPickerProduct(null);
  if (product) openEntry(product, null);
};



const handleUpdateCartItem = (itemId, updates) => {
  const updateCart = isReturnMode ? setReturnCartItems : setCartItems;

  updateCart((prev) =>
    prev.map((item) => {
      if ((item._id || item.id) !== itemId) return item;

      return {
        ...item,
        qty: updates.qty,
        bags: updates.bags,
        units_per_bag: updates.units,
        price: updates.price,
        description: updates.description,
      };
    })
  );
};

  const handleOpenManageItem = (item) => {
    setManagedItem(item);
  };

  const handleCloseManageItem = () => {
    setManagedItem(null);
  };


const handleIncrement = (item) => {
  const updateCart = isReturnMode ? setReturnCartItems : setCartItems;
  const itemId = item._id || item.id;
  updateCart((prev) =>
    prev.map((i) => {
      if ((i._id || i.id) !== itemId) return i;
      const step = Number(i.units_per_bag) > 0 ? Number(i.units_per_bag) : 1;
      return {
        ...i,
        qty: (Number(i.qty) || 0) + step,
        bags: i.bags != null ? i.bags + 1 : i.bags,
      };
    })
  );
};

const handleDecrement = (item) => {
  const updateCart = isReturnMode ? setReturnCartItems : setCartItems;
  const itemId = item._id || item.id;
  updateCart((prev) =>
    prev
      .map((i) => {
        if ((i._id || i.id) !== itemId) return i;
        const step = Number(i.units_per_bag) > 0 ? Number(i.units_per_bag) : 1;
        return {
          ...i,
          qty: (Number(i.qty) || 0) - step,
          bags: i.bags != null ? i.bags - 1 : i.bags,
        };
      })
      .filter((i) => (Number(i.qty) || 0) > 0)
  );
};

const handleRemove = (item) => {
  const updateCart = isReturnMode ? setReturnCartItems : setCartItems;
  const itemId = item._id || item.id;

  updateCart((prev) =>
    prev.filter((i) => (i._id || i.id) !== itemId)
  );
};



const handleClearCart = () => {
  if (isReturnMode) {
    setReturnCartItems([]);
  } else {
    setCartItems([]);
  }
};


const activeCartItems = isReturnMode ? returnCartItems : cartItems;

const { subtotal } = useMemo(() => {
  const sub = activeCartItems.reduce(
    (sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0),
    0
  );

  return { itemsCount: activeCartItems.length, subtotal: sub };
}, [activeCartItems]);

const discount = 0;
const tax = 0;
const grandTotal = subtotal;

  useEffect(() => {
    if (!route.params?.clearCart) return;

    const resetPOS = async () => {
      setCartItems([]);
      setSelectedCustomer(WALK_IN_CUSTOMER);
      setSaleDate(null);

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

const handleUpdateInvoice = async (confirmRefund = false) => {
  if (!isEditMode) return;

  const invoiceId =
    editInvoice?._id ||
    editInvoice?.id ||
    editInvoice?.sale_id;

  if (!invoiceId) {
    Alert.alert("Error", "Invoice ID not found.");
    return;
  }

  if (!cartItems.length) {
    Alert.alert("Empty Cart", "Please add items before updating the invoice.");
    return;
  }

  const customerId =
    selectedCustomer === WALK_IN_CUSTOMER
      ? null
      : selectedCustomer?._id || selectedCustomer?.id;

const items = cartItems.map((item) => ({
  product_id: item.product_id || item._id || item.id || null,

  product_name:
    item.product || item.product_name || item.name || "Item",

  description: item.description || "",

  qty: Number(item.qty) || 0,

  bags: Number(item.bags) || 0,

  units_per_bag: Number(item.units_per_bag) || 0,

  rate: Number(item.price ?? item.rate ?? 0),
}));

  if (items.some((item) => item.qty <= 0 || item.rate < 0)) {
    Alert.alert("Invalid Items", "Please check item quantities and prices.");
    return;
  }

  try {
    setPaymentLoading(true);

    const payload = {
      customer_id: customerId,
      items,
      discount_amount: Number(discount) || 0,
      transportationDetails,
      invoice_date: saleDate || toYMD(new Date()),
      ...(confirmRefund ? { confirmRefund: true } : {}),
    };

    await updateSale(invoiceId, payload);

    Alert.alert("Invoice Updated", "Invoice updated successfully.", [
      {
        text: "OK",
        onPress: () => {
          setCartItems([]);
          setSelectedCustomer(WALK_IN_CUSTOMER);
          setEditingInvoice(null);
          editInvoiceLoadedRef.current = null;
          setTransportationDetails("");
          setTransportationInput("");
          setSaleDate(null);
          setPaymentLoading(false);
          setActiveNav("cart");
        },
      },
    ]);
  } catch (error) {
    const errorData = error?.response?.data || {};

    console.log(
      "❌ INVOICE UPDATE ERROR:",
      errorData || error?.message || error
    );

    if (errorData.requiresRefund && !confirmRefund) {
      const refundAmount = Number(errorData.refundAmount || 0);

      Alert.alert(
        "Excess Payment – Refund Required",
        `₹${refundAmount.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} is excess and must be refunded. Do you want to confirm this refund and update the invoice?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
         {
  text: "Confirm Refund",
  onPress: () => {
    console.log("🔥 CONFIRM REFUND BUTTON PRESSED");
    handleUpdateInvoice(true);
  },
},
        ]
      );

      return;
    }

    Alert.alert(
      "Update Failed",
      errorData.message ||
        errorData.error ||
        error?.message ||
        "Unable to update invoice."
    );
  } finally {
    setPaymentLoading(false);
  }
};

const handlePaymentSubmit = async ({
  amount,
  method,
  date,
  remarks,
}) => {
  if (!paymentCustomer) return;

  try {
    setPaymentLoading(true);

    const payload = {
      amount: Number(amount),
      payment_method: method,
      payment_date: date,
      reference_no: "",
      remarks: typeof remarks === "string" ? remarks.trim() : "",
    };

    if (paymentSaleId) {
      payload.sale_id = paymentSaleId;
    } else {
      payload.customer_id =
        paymentCustomer?._id ||
        paymentCustomer?.id;
    }

    console.log(
      "💰 CUSTOMER PAYMENT PAYLOAD:",
      payload
    );

    const response = await createPayment(payload);

    console.log(
      "✅ CUSTOMER PAYMENT SUCCESS:",
      response
    );

    Alert.alert(
      "Payment Received",
      `₹${Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} received successfully.`
    );

    setPaymentCustomer(null);
    setPaymentSaleId(null);

    await loadCustomers({ silent: true });

  } catch (error) {
    console.log(
      "❌ CUSTOMER PAYMENT ERROR:",
      error?.response?.data ||
      error?.message ||
      error
    );

    Alert.alert(
      "Payment Failed",
      error?.response?.data?.message ||
        "Unable to receive payment."
    );

  } finally {
    setPaymentLoading(false);
  }
};


useEffect(() => {
  // Clear searches whenever the user switches screens
  setSearchText("");
  setCatalogSearchText("");
  setCustomerListSearch("");
}, [activeNav]);






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
 activeNav !== "productForm" && 
!(
  activeNav === "customers" &&
  (selectedCustomerAccount || showInactiveCustomersPage)
) && (

  
<Header
  title={activeNav === "customers" ? "Customers" : "Cart"}
  totalOutstanding={
    activeNav === "customers" ? totalOutstanding : null
  }
  onOutstandingReportPress={() =>
  handlePrintOutstandingReport(customers)
}
  hideSearch={isCalculatorMode && activeNav !== "customers"}
  hideScanner={isCalculatorMode || activeNav === "customers"}
  hideCustomer={activeNav === "customers"}

hideHeldCarts={activeNav === "customers"}
onHoldCartPress={requestHoldCart}
onHeldCartsPress={() => setHeldCartsSheetVisible(true)}
heldCartsCount={heldCarts.length}


  hideAdd={activeNav !== "customers"}
  addLabel={activeNav === "customers" ? "Add Customer" : undefined}
onAddPress={
  activeNav === "customers"
    ? () => handleOpenCustomerForm(true)
    : undefined
}
  screenName={activeNav}
  screenTitle=""
  onBack={handleCloseProductForm}
  sidebarCollapsed={sidebarCollapsed}
  onMenuPress={(e) => {
    setSidebarCollapsed(false);
  
      }}
      searchInputRef={searchInputRef}
     searchValue={activeNav === "customers" ? customerListSearch : searchText}
onSearchChange={
  activeNav === "customers" ? setCustomerListSearch : handleSearchChange
}
onSubmitEditing={
  activeNav === "customers" ? undefined : handleBarcodeScan
}
searchPlaceholder={
  activeNav === "customers"
    ? "Search by name, phone or company"
    : undefined
}
      onScanPress={() => {
        searchInputRef.current?.focus();
      }}
      onCustomerPress={handleOpenCustomerSearch}
      customerSelected={
  (isReturnMode ? returnSelectedCustomer : selectedCustomer) !==
  WALK_IN_CUSTOMER
}
      onScreenAction={() => {
        setEditingCategory(null);
        setCategoryModalVisible(true);
      }}
      onAddProduct={() => addProductTriggerRef.current()}
      isEditingProduct={!!productFormState?.product}
      editingProductName={productFormState?.product?.product || ""}
      itemCount={activeNav === "inventory" ? products.length : 0}
 

rightExtra={null}


returnButton={activeNav === "cart"}
onReturnPress={() => {
  setIsReturnMode((prev) => !prev);
  setManagedItem(null);
}}
isReturnMode={isReturnMode}
onTransportationPress={() => {
  setTransportationInput(transportationDetails);
  setTransportModalVisible(true);
}}
transportationDetails={transportationDetails}



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
    onProductPress={handleProductTap}
  onProductLongPress={handleProductLongPress}
onAddItem={handleAddProductFromPOS}
/>
  )}
</View>

                <View style={styles.rightPane}>
                  <CartPanel
                   cartItems={activeCartItems}
                    onClearCart={handleClearCart}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                    saleDateLabel={saleDateLabel}
onDatePress={() => setShowDatePicker(true)}
                    onRemove={handleRemove}
                    onOpenManageItem={handleOpenManageItem}
                    onHoldCart={handleHoldCart}
                   customers={activeCustomers}
                  selectedCustomer={
  (isReturnMode ? returnSelectedCustomer : selectedCustomer) ===
  WALK_IN_CUSTOMER
    ? null
    : isReturnMode
      ? returnSelectedCustomer
      : selectedCustomer
}
onSelectCustomer={(customer) => {
  const nextCustomer = customer || WALK_IN_CUSTOMER;

  if (isReturnMode) {
    setReturnSelectedCustomer(nextCustomer);
  } else {
    setSelectedCustomer(nextCustomer);
  }
}}
                 grandTotal={grandTotal}
transportationDetails={transportationDetails}
                  checkoutDisabled={activeCartItems.length === 0}
checkoutLabel={
  isReturnMode ? "RETURN" : isEditMode ? "UPDATE" : "Checkout"
}
isReturnMode={isReturnMode}
checkoutLoading={
  isReturnMode ? isSubmittingReturn : isEditMode && paymentLoading
}

onCheckout={async () => {
if (isReturnMode) {
  const activeCustomer = returnSelectedCustomer;

  if (isSubmittingReturn) return;

    if (
!activeCustomer ||
activeCustomer === WALK_IN_CUSTOMER
    ) {
      Alert.alert(
        "Select Customer",
        "Please select a customer before processing a return."
      );
      return;
    }

    if (!activeCartItems.length) {
      Alert.alert(
        "Empty Return",
        "Please add items to the return cart."
      );
      return;
    }

const customerId =
  activeCustomer?._id || activeCustomer?.id;

    if (!customerId) {
      Alert.alert(
        "Invalid Customer",
        "Please select a valid customer."
      );
      return;
    }

 

const returnItems = activeCartItems.map((item) => ({
  product_id: item._id || item.id || null,
  description:
    item.product_name ||
    item.product ||
    item.item_name ||
    item.name ||
    item.description ||
    "Calculator item",
  product_name:
    item.product_name ||
    item.product ||
    item.item_name ||
    item.name ||
    item.description ||
    "Calculator item",
  qty: Number(item.qty) || 0,
  price: Number(item.price) || 0,
}));



    const hasInvalidItems = returnItems.some(
      (item) =>
        item.qty <= 0 ||
        item.price < 0 ||
        !Number.isFinite(item.qty) ||
        !Number.isFinite(item.price)
    );

    if (hasInvalidItems) {
      Alert.alert(
        "Invalid Items",
        "Please check the quantity and price of each item."
      );
      return;
    }

    setIsSubmittingReturn(true);

    try {

const response = await createCustomerReturn({
  customer_id: customerId,
  items: returnItems,
});

const payload = response?.data ?? response;
const result = payload?.data ?? payload;

const customerName =
  returnSelectedCustomer?.customer_name ||
  `${returnSelectedCustomer?.first_name || ""} ${
    returnSelectedCustomer?.last_name || ""
  }`.trim() ||
  "Customer";

// Clear the return cart and exit return mode.
setReturnCartItems([]);
setReturnSelectedCustomer(WALK_IN_CUSTOMER);
setIsReturnMode(false);
setManagedItem(null);
setActiveNav("cart");


// Refresh customer balances.
// Refresh customer balances.
loadCustomers({ silent: true });

// Navigate to the return success screen.
navigation.navigate("POSReturnSuccess", {
  returnNo: result?.return_no || result?.returnNo || "",
  amount: Number(
    result?.total_amount ??
    result?.totalAmount ??
    subtotal ??
    0
  ),
  outstanding: Number(
    result?.outstanding ??
    result?.customer_outstanding ??
    activeCustomer?.outstanding ??
    0
  ),
  customerName,
});







 
    } catch (error) {
      Alert.alert(
        "Return Failed",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Unable to process the return. Please try again."
      );
    } finally {
      setIsSubmittingReturn(false);
    }

     return;
  }

  // Edit mode: update the existing invoice directly without checkout or payment.
  if (isEditMode) {
    await handleUpdateInvoice();
    return;
  }

  console.log(
    "🛒 CART ITEMS BEFORE PAYMENT SUMMARY:",
  JSON.stringify(cartItems, null, 2)
);


// All sales — including walk-in customers — go through Payment Summary.
navigation.navigate("PaymentSummary", {
  cartItems: cartItems.map((item) => ({
    ...item,
    qty: Number(item.qty) || 0,
    bags: Number(item.bags) || 0,
    units_per_bag: Number(item.units_per_bag) || 0,
  })),

  customer:
    selectedCustomer === WALK_IN_CUSTOMER
      ? null
      : selectedCustomer,

  subtotal,
  tax,
  discount,
  grandTotal,
  transportationDetails,
  saleDate: saleDate || toYMD(new Date()),

  // NEW: preserve the invoice being edited
  editInvoiceId: isEditMode
    ? editInvoice?._id || editInvoice?.id || editInvoice?.sale_id
    : null,
});


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
searchValue={catalogSearchText}
onSearchChange={setCatalogSearchText}
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
  posQuickAdd={productFormState.posQuickAdd === true}
/>
              </View>
            )}
{activeNav === "customers" && (
  <View style={styles.fullContent}>
    {showInactiveCustomersPage ? (
      <InactiveCustomersScreen
        customers={customers.filter((c) => c.is_active === false)}
        searchValue={customerListSearch}
        onSearchChange={setCustomerListSearch}
        onBack={() => setShowInactiveCustomersPage(false)}
        onCustomerPress={(customer) => {
          setSelectedCustomerAccount(customer);
          setShowInactiveCustomersPage(false);
        }}
        onPayPress={handleCustomerPay}
        onPrintSummary={handlePrintCustomerSummary}
      />
    ) : selectedCustomerAccount ? (
     
<CustomerAccountScreen
  key={`${selectedCustomerAccount._id || selectedCustomerAccount.id}-${accountRefreshKey}`}
  customer={selectedCustomerAccount}
  company={user?.company || user?.company_id || null}
  onBack={() => setSelectedCustomerAccount(null)}
  onMenuPress={() => setSidebarCollapsed(false)}
  onEditPress={handleOpenEditCustomer}
/>

    ) : (
  <CustomerListScreen
  customers={customers}
  searchValue={customerListSearch}
  onCustomerPress={(customer) => setSelectedCustomerAccount(customer)}
  onPayPress={handleCustomerPay}
  onPrintSummary={handlePrintCustomerSummary}
  onPrintOutstandingReport={handlePrintOutstandingReport}
  onOpenInactiveCustomers={() => {
    setCustomerListSearch("");
    setShowInactiveCustomersPage(true);
  }}
/>
    )}
  </View>
)}



{activeNav === "orders" && (
  <View style={styles.fullContent}>
    <OrdersScreen
      onBack={() => setActiveNav("cart")}
      onMenuPress={() => setSidebarCollapsed(false)}
      onAccount={(customerId, customer) => {
        const matchedCustomer = customers.find(
          (c) =>
            String(c._id || c.id) === String(customerId)
        );

        setSelectedCustomerAccount({
          ...(matchedCustomer || {}),
          ...(customer || {}),
          _id: customerId,
        });

        setShowInactiveCustomersPage(false);
        setActiveNav("customers");
      }}
            onEditInvoice={handleEditInvoice}
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

  

<CategoryModal
  visible={categoryModalVisible}
  category={editingCategory}
  loading={categoryLoading}
  onClose={() => setCategoryModalVisible(false)}
  onDelete={editingCategory ? () => handleDeleteCategory(editingCategory) : undefined}
onSave={async (formData) => {
  try {
    setCategoryLoading(true);

    console.log("CATEGORY SAVE PAYLOAD:", formData);

    if (editingCategory) {
      await updateCategory(editingCategory._id, formData);
    } else {
      await createCategory(formData);
    }

await loadCategories();
setCategoryModalVisible(false);
setEditingCategory(null);

  } catch (err) {
    console.log("CATEGORY SAVE ERROR:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });

    Alert.alert(
      "Category Save Failed",
      err.response?.data?.message || "Unable to save category."
    );
  } finally {
    setCategoryLoading(false);
  }
}}
/>

<ManageCartItemModal
  visible={!!managedItem}
  item={managedItem}
  isCalculatorMode={isCalculatorMode}
  onClose={handleCloseManageItem}
  onApply={(updates) => {
    if (managedItem) {
      handleUpdateCartItem(
        managedItem._id || managedItem.id,
        updates
      );
    }
    handleCloseManageItem();
  }}
/>

<UnitPickerModal
  visible={!!pickerProduct}
  product={pickerProduct}
  options={pickerProduct ? getUnitOptions(pickerProduct) : []}
  onPick={handlePickUnit}
  onOther={handlePickOther}
  onClose={() => setPickerProduct(null)}
/>

<QuickQtyModal
  visible={!!quickAddProduct}
  product={quickAddProduct}
  initialUnits={quickPrefillUnits}
  onClose={closeEntry}
  onAdd={handleQuickAdd}
/>


{showDatePicker && (
<DateTimePicker
  value={
    saleDate
      ? new Date(`${saleDate}T12:00:00`)
      : new Date()
  }
  mode="date"
  display="calendar"
  onChange={handleDateChange}
/>
)}

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
  onAddNew={() => handleOpenCustomerForm(false)}
/>
        ) : (
    <CustomerFormScreen
  mode={editingCustomer ? "edit" : "add"}
  isActive={editingCustomer?.is_active !== false}
  onToggleActive={handleToggleCustomerActive}
  values={customerFormValues}
  onChange={handleChangeCustomerForm}
  onBack={handleCloseCustomerForm}
  onSave={handleSaveCustomerForm}
  saving={savingCustomer}
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



<Modal
  visible={transportModalVisible}
  animationType="slide"
  presentationStyle="fullScreen"
  onRequestClose={() => {
    setTransportationFocused(false);
    setTransportModalVisible(false);
  }}
>
  <SafeAreaView
    style={{
      flex: 1,
      backgroundColor: COLORS.navyDeep,
    }}
    edges={["top", "bottom"]}
  >
    {/* Header — matches Customer Form */}
    <View
      style={{
        height: 64,
        backgroundColor: COLORS.navy,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: SPACING.lg,
      }}
    >
      <Pressable
        onPress={() => {
          setTransportationFocused(false);
          setTransportModalVisible(false);
        }}
        hitSlop={8}
        style={{
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          marginRight: SPACING.md,
        }}
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={24}
          color={COLORS.textOnDark}
        />
      </Pressable>

      <MaterialCommunityIcons
        name="truck-outline"
        size={23}
        color={COLORS.textOnDark}
        style={{ marginRight: SPACING.sm }}
      />

      <Text
        style={{
          flex: 1,
          color: COLORS.textOnDark,
          fontSize: 19,
          fontWeight: "700",
        }}
      >
        Transportation Details
      </Text>

      <Pressable
        onPress={() => {
          setTransportationDetails(transportationInput.trim());
          setTransportationFocused(false);
          setTransportModalVisible(false);
        }}
        hitSlop={8}
        style={{
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs,
        }}
      >
        <Text
          style={{
            color: COLORS.textOnDark,
            fontSize: 16,
            fontWeight: "700",
          }}
        >
          Save
        </Text>
      </Pressable>
    </View>

    {/* Form body */}
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.card,
      }}
    >
    
<ScrollView
  keyboardShouldPersistTaps="always"
  contentContainerStyle={{
    flexGrow: 1,
    paddingBottom: SPACING.xxl,
  }}
>
  <View
    style={{
      width: "100%",
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.xl,
    }}
  >

      
{/* Section — matches CustomerFormScreen */}
<View
  style={{
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  }}
>
  <Text
    style={{
      fontSize: 21,
      fontWeight: "700",
      color: COLORS.textPrimary,
      marginBottom: SPACING.xl,
    }}
  >
    Transportation Details
  </Text>

  <View style={{ marginBottom: SPACING.xl }}>
   

    <TextInput
      value={transportationInput}
      onChangeText={setTransportationInput}
    
      placeholderTextColor={COLORS.textMuted}
      multiline
      maxLength={200}
      autoFocus={false}
      returnKeyType="default"
      blurOnSubmit={false}
      onFocus={() => setTransportationFocused(true)}
      onBlur={() => setTransportationFocused(false)}
      style={{
        fontSize: 19,
        color: COLORS.textPrimary,
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1.5,
        borderBottomColor: transportationFocused
          ? COLORS.blue
          : COLORS.divider,
        textAlignVertical: "top",
        minHeight: 70,
      }}
    />

    <Text
      style={{
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: SPACING.sm,
        textAlign: "right",
      }}
    >
      {transportationInput.length}/200 characters
    </Text>
  </View>
</View>
</View>
</ScrollView>


      
    </View>
  </SafeAreaView>
</Modal>




<CustomerPaymentModal
  visible={!!paymentCustomer}
  customer={paymentCustomer}
  fetching={paymentFetching}
  loading={paymentLoading}
  onClose={() => {
    if (!paymentLoading) {
      setPaymentCustomer(null);
      setPaymentSaleId(null);
    }
  }}
  onSubmit={handlePaymentSubmit}
/>


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
    returnBtn: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.blue,
    backgroundColor: "transparent",
  },
  returnBtnActive: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  returnBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.blue },
  returnBtnTextActive: { color: "#FFFFFF" },

 
 
});