// screens/pos/POSScreen.js
import React, { useMemo, useState, useRef } from "react";
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
import CustomerPaymentModal from "../../components/CustomerPaymentModal";
import { COLORS, SPACING, RADIUS } from "../../components/Colors";
import { createPayment } from "../../api/payment";

import { useEffect } from "react";
import { fetchProducts } from "../../api/product";
import {
  fetchCustomers,
  createCustomer,
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
  const [profileVisible, setProfileVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [managedItem, setManagedItem] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(WALK_IN_CUSTOMER);
const [customerListSearch, setCustomerListSearch] = useState("");

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


const handleOpenCustomerForm = (fromList = false) => {
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
    return;
  }

  setCustomerModalMode("search");
};
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
  company_name: customerFormValues.company_name || "",
  contact_no_1: customerFormValues.mobile || "",
  email: customerFormValues.email || "",
  address_line_1: customerFormValues.address1 || "",
  address_line_2: customerFormValues.address2 || "",
  state: customerFormValues.state || "",
  opening_balance: Number(customerFormValues.opening_balance || 0),
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
  try {
    const customerId = customer?._id || customer?.id;

    if (!customerId) {
      Alert.alert("Error", "Customer ID not found.");
      return;
    }

    setPaymentFetching(true);

    console.log("========== CUSTOMER PAYMENT ==========");
    console.log("CUSTOMER:", customer);
    console.log("CUSTOMER ID:", customerId);

    // Clear previous selected invoice
    setPaymentSaleId(null);

    const response = await fetchCustomerInvoices(customerId);

    console.log("📦 RAW CUSTOMER INVOICES RESPONSE:", response);

    const sales =
      response?.data?.data ||
      response?.data ||
      [];

    console.log("📄 CUSTOMER SALES:", sales);

    // Find unpaid invoices only
    const unpaidSales = sales
      .map((sale) => {
        const total = Number(sale.total_amount || 0);

        const paid = Number(
          sale.paid_amount ||
          0
        );

        const remaining = Number(
          sale.remaining_amount ??
          Math.max(0, total - paid)
        );

        console.log("INVOICE:", {
          id: sale._id,
          invoice_no: sale.invoice_no,
          total,
          paid,
          remaining,
          status: sale.status,
        });

        return {
          ...sale,
          remaining_amount: remaining,
        };
      })
      .filter(
        (sale) =>
          Number(sale.remaining_amount || 0) > 0
      );

    console.log("💰 UNPAID SALES:", unpaidSales);

    // Newest unpaid invoice first
    unpaidSales.sort(
      (a, b) =>
        new Date(
          b.invoice_date ||
          b.createdAt ||
          0
        ) -
        new Date(
          a.invoice_date ||
          a.createdAt ||
          0
        )
    );

    // If there is an unpaid invoice,
    // payment will start from that invoice.
    if (unpaidSales.length > 0) {
      const newestUnpaidSale = unpaidSales[0];

      console.log(
        "✅ PAYMENT WILL START FROM INVOICE:",
        newestUnpaidSale.invoice_no,
        newestUnpaidSale._id
      );

      setPaymentSaleId(newestUnpaidSale._id);
    } else {
      // No unpaid invoices.
      // Payment will go against opening balance.
      console.log(
        "ℹ️ NO UNPAID INVOICE"
      );

      console.log(
        "💰 OPENING BALANCE:",
        customer.opening_balance
      );

      console.log(
        "💰 OPENING BALANCE PAID:",
        customer.opening_balance_paid
      );

      console.log(
        "💰 REMAINING OPENING BALANCE:",
        customer.remaining_opening_balance
      );

      setPaymentSaleId(null);
    }

    // Open payment modal
    setPaymentCustomer(customer);

  } catch (error) {
    console.log(
      "❌ CUSTOMER PAYMENT LOAD ERROR:",
      error?.response?.data ||
      error?.message ||
      error
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
const invoiceRows = filteredInvoices.map((invoice) => ({
  date: getDate(invoice).toLocaleDateString("en-GB"),
  kind: "invoice",

  title:
    invoice.invoice_no ||
    invoice.invoiceNo ||
    "Invoice",

  note: "",

  amount: Number(
    invoice.total_amount ??
      invoice.amount ??
      0
  ),

  lines: Array.isArray(invoice.items)
    ? invoice.items.map((item) => ({
        qty: Number(
          item?.qty ??
          item?.quantity ??
          0
        ),

        rate: Number(
          item?.rate ??
          item?.price ??
          item?.selling_price ??
          item?.unit_price ??
          0
        ),

        amount: Number(
          item?.amount ??
          0
        ),
      }))
    : [],

  sortDate: getDate(invoice).getTime(),
}));

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

    const openingBalance = Number(
      customer?.opening_balance ||
        customer?.openingBalance ||
        0
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
  hideMore={activeNav === "customers"}
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
{activeNav === "customers" && (
  <View style={styles.fullContent}>
    {selectedCustomerAccount ? (
   <CustomerAccountScreen
  customer={selectedCustomerAccount}
  onBack={() => setSelectedCustomerAccount(null)}
  onMenuPress={() => setSidebarCollapsed(false)}
/>
    ) : (
<CustomerListScreen
  customers={customers}
  searchValue={customerListSearch}
  onCustomerPress={(customer) => {
    setSelectedCustomerAccount(customer);
  }}
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
           onAddNew={() => handleOpenCustomerForm(false)}
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
 
});