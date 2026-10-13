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
import { WALK_IN_CUSTOMER } from "../../components/CustomerSelector";
import CustomerSearchScreen from "../Customer/CustomerSearchScreen";
import CustomerFormScreen from "../Customer/CustomerFormScreen";
import CustomerPaymentModal from "../../components/CustomerPaymentModal";
import { COLORS, SPACING, RADIUS } from "../../components/Colors";
import { createPayment } from "../../api/payment";
import { createCustomerReturn } from "../../api/customerReturn";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useEffect } from "react";
import { fetchProducts } from "../../api/product";
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
   import { fetchCategories } from "../../api/category";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CategoryModal from "../../components/CategoryModal";
import CalculatorPane from "../../components/CalculatorPane";
import ProfileScreen from "../Profile/ProfileScreen";
import { createCategory, updateCategory, deleteCategory } from "../../api/category";

import { getCached, setCached, getCachedSync } from "../../utils/cache";

const { SunmiScanner } = NativeModules;
const scannerEmitter = DeviceEventEmitter;
const APP = { name: "D'LumeBiz", registerType: "Default Register" };
const HELD_CARTS_STORAGE_KEY = "pos:held-carts:v1";


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
  const [selectedCustomerAccount, setSelectedCustomerAccount] = useState(null);
  const [paymentCustomer, setPaymentCustomer] = useState(null);

const [paymentLoading, setPaymentLoading] = useState(false);
const [paymentFetching, setPaymentFetching] = useState(false);
const [customerPaymentResult, setCustomerPaymentResult] = useState(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [isReturnMode, setIsReturnMode] = useState(false);
  
const [transportModalVisible, setTransportModalVisible] = useState(false);
const [transportationDetails, setTransportationDetails] = useState("");
const [transportationInput, setTransportationInput] = useState("");

const [returnCartItems, setReturnCartItems] = useState([]);
const [returnSelectedCustomer, setReturnSelectedCustomer] =
  useState(WALK_IN_CUSTOMER);
const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [managedItem, setManagedItem] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(WALK_IN_CUSTOMER);
const [customerListSearch, setCustomerListSearch] = useState("");
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
  company_name: c.company_name || "",
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
      const { opening_balance, ...updatePayload } = payload; // opening balance is not editable

      const res = await updateCustomer(id, updatePayload);
      const updated = res?.data?.data || res?.data || {};

      setSelectedCustomerAccount((prev) => ({
        ...(prev || editingCustomer),
        ...updatePayload,
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

  // ── Held Carts ────────────────────────────────────────────────────────────
const [heldCarts, setHeldCarts] = useState([]);
const [heldCartsLoaded, setHeldCartsLoaded] = useState(false);

const [heldCartsSheetVisible, setHeldCartsSheetVisible] =
  useState(false);

useEffect(() => {
  const loadHeldCarts = async () => {
    try {
      const saved = await AsyncStorage.getItem(
        HELD_CARTS_STORAGE_KEY
      );

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setHeldCarts(parsed);
        }
      }
    } catch (error) {
      console.log("LOAD HELD CARTS ERROR:", error);
    } finally {
      setHeldCartsLoaded(true);
    }
  };

  loadHeldCarts();
}, []);

useEffect(() => {
  if (!heldCartsLoaded) return;

  AsyncStorage.setItem(
    HELD_CARTS_STORAGE_KEY,
    JSON.stringify(heldCarts)
  ).catch((error) => {
    console.log("SAVE HELD CARTS ERROR:", error);
  });
}, [heldCarts, heldCartsLoaded]);

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

  // Open the modal immediately — don't wait for the API.
  setPaymentSaleId(null);
  setPaymentCustomer(customer);
  setPaymentFetching(true);

  try {
    const response = await fetchCustomerInvoices(customerId);

    const sales =
      response?.data?.data ??
      response?.data ??
      [];

    const unpaidSales = (Array.isArray(sales) ? sales : [])
      .map((sale) => {
        const total = Number(sale.total_amount || 0);
        const paid = Number(sale.paid_amount || 0);

        const remaining = Number(
          sale.remaining_amount ??
            Math.max(0, total - paid)
        );

        return {
          ...sale,
          remaining_amount: remaining,
        };
      })
      .filter(
        (sale) => Number(sale.remaining_amount || 0) > 0
      );

    // Newest unpaid invoice first.
    unpaidSales.sort(
      (a, b) =>
        new Date(b.invoice_date || b.createdAt || 0) -
        new Date(a.invoice_date || a.createdAt || 0)
    );

    // Preserve existing invoice/opening-balance payment logic.
    setPaymentSaleId(
      unpaidSales.length > 0 ? unpaidSales[0]._id : null
    );
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
    const [invoiceResponse, paymentResponse] = await Promise.all([
      fetchCustomerInvoices(customerId),
      fetchCustomerPayments(customerId),
    ]);

    const invoices =
      invoiceResponse?.data?.data ||
      invoiceResponse?.data ||
      [];

    const payments =
      paymentResponse?.data?.data ||
      paymentResponse?.data ||
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

    const rows = [
      ...invoiceRows,
      ...paymentRows,
    ]
      .sort((a, b) => a.sortDate - b.sortDate)
      .map(({ sortDate, ...row }) => row);

    const totalInvoiced = invoiceRows.reduce(
      (sum, row) => sum + row.amount,
      0
    );

    const totalReceived = paymentRows.reduce(
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

  updateCart((prev) => {
    const existing = prev.find(
      (item) => (item._id || item.id) === productId
    );

    if (existing) {
      return prev.map((item) =>
        (item._id || item.id) === productId
          ? { ...item, qty: (Number(item.qty) || 0) + qtyToAdd }
          : item
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
  const updateCart = isReturnMode
    ? setReturnCartItems
    : setCartItems;

  updateCart((prev) =>
    prev.map((item) =>
      (item._id || item.id) === itemId
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


const handleIncrement = (item) => {
  const updateCart = isReturnMode ? setReturnCartItems : setCartItems;
  const itemId = item._id || item.id;

  updateCart((prev) =>
    prev.map((i) =>
      (i._id || i.id) === itemId
        ? { ...i, qty: (Number(i.qty) || 0) + 1 }
        : i
    )
  );
};

const handleDecrement = (item) => {
  const updateCart = isReturnMode ? setReturnCartItems : setCartItems;
  const itemId = item._id || item.id;

  updateCart((prev) =>
    prev
      .map((i) =>
        (i._id || i.id) === itemId
          ? { ...i, qty: (Number(i.qty) || 0) - 1 }
          : i
      )
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
  if (activeNav !== "customers") setCustomerListSearch("");
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
 !(activeNav === "customers" && selectedCustomerAccount) && (

  
<Header
  title={activeNav === "customers" ? "Customers" : "Cart"}
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


returnButton={activeNav === "cart" && isCalculatorMode}
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
      onProductPress={handleProductPress}
    />
  )}
</View>

                <View style={styles.rightPane}>
                  <CartPanel
                   cartItems={activeCartItems}
                    onClearCart={handleClearCart}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
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
checkoutLabel={isReturnMode ? "RETURN" : "Checkout"}
isReturnMode={isReturnMode}
checkoutLoading={isReturnMode && isSubmittingReturn}

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



  // Existing Sale checkout — unchanged
 
const isCreditMode = user?.company?.payment_mode === "CREDIT";

if (isCreditMode && selectedCustomer !== WALK_IN_CUSTOMER) {
  navigation.navigate("CreditSummary", {
    cartItems,
    customer: selectedCustomer,
    subtotal,
    tax,
    discount,
    grandTotal,
    transportationDetails,
  });
} else {
  navigation.navigate("Checkout", {
    cartItems,
    customer: selectedCustomer,
    subtotal,
    tax,
    discount,
    grandTotal,
    transportationDetails,
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
{activeNav === "customers" && (
  <View style={styles.fullContent}>
    {selectedCustomerAccount ? (
      <CustomerAccountScreen
        key={`${selectedCustomerAccount._id || selectedCustomerAccount.id}-${accountRefreshKey}`}
        customer={selectedCustomerAccount}
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
      />
    )}
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
    handleUpdateCartItem(
      managedItem._id || managedItem.id,
      updates
    );
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