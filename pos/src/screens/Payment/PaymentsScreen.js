// screens/PaymentsScreen.js
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
  RefreshControl,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import API from "../../api/axios";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import {
  COLORS as colors,
  RADIUS as radii,
  SPACING as spacing,
} from "../../components/Colors";
import Header from "../../components/Header";
// Same shared cache module used by OrdersScreen — see utils/cache.js for
// how the sync/async split works.
import { getCached, setCached, getCachedSync } from "../../utils/cache";

let AsyncStorage = null;
try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch (e) {
  AsyncStorage = null;
}

const getToken = async () => {
  if (!AsyncStorage) return null;
  try {
    return await AsyncStorage.getItem("access_token");
  } catch (e) {
    return null;
  }
};

const money = (n) => Number(n || 0).toFixed(2);

// ── Date helpers ───────────────────────────────────────────────────────

// Local YYYY-MM-DD key for a JS Date (used for the calendar picker values).
const dateKey = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// YYYY-MM-DD key for a PAYMENT's date value. Uses exactly the same rules as
// formatDate below, so the date a row is *displayed* under is always the
// date it's *filtered* under:
//   - plain "YYYY-MM-DD" business dates are used as-is
//   - old ISO timestamps are shifted to IST first
const paymentDateKey = (value) => {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const yyyy = ist.getUTCFullYear();
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(ist.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateLong = (d) => {
  if (!d) return "-";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return "-";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

// Sun-first month grid (nulls = leading blank cells) for the lightweight
// date picker — no extra date-picker dependency needed.
const getCalendarCells = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
};

const formatDate = (value) => {
  if (!value) return "-";

  const dateString = String(value);

  // YYYY-MM-DD
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}/${mm}/${yyyy}`;
  }

  // Temporary support for old ISO records
  const d = new Date(dateString);

  if (isNaN(d.getTime())) return "-";

  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);

  const dd = String(ist.getUTCDate()).padStart(2, "0");
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = ist.getUTCFullYear();

  return `${dd}/${mm}/${yyyy}`;
};

const dateGroupFor = (isoDate) => {
  return formatDate(isoDate);
};

// ─── Method normalization ──────────────────────────────────────────────────
// Raw payment_method values coming from the API can be inconsistent
// ("Cash", "cash", "UPI", "Gpay", "Card", "Debit Card", etc). This maps any
// of those into one of four canonical buckets used for filtering & totals.
// "other" still exists as a bucket (so unrecognized methods still count
// toward "All" totals/list), it's just not given its own dropdown option.
const METHOD_KEYS = ["cash", "upi", "card"];

const METHOD_META = {
  cash: { label: "Cash", icon: "cash", color: "#16A34A" },
  upi: { label: "UPI", icon: "qrcode-scan", color: "#7C3AED" },
  card: { label: "Card", icon: "credit-card-outline", color: "#2563EB" },
  other: { label: "Other", icon: "dots-horizontal-circle-outline", color: colors.textMuted },
};

const normalizeMethod = (raw) => {
  const m = String(raw || "").trim().toLowerCase();
  if (!m) return "other";
  if (m.includes("cash")) return "cash";
  if (
    m.includes("upi") ||
    m.includes("gpay") ||
    m.includes("phonepe") ||
    m.includes("paytm") ||
    m.includes("bhim")
  )
    return "upi";
  if (m.includes("card") || m.includes("credit") || m.includes("debit")) return "card";
  return "other";
};

const mapPayment = (col) => {
  const rawMethod = col.payment_method || col.paymentMode || "-";

  const customer = col.customer_id || col.client_id || {};

  const customerName =
    col.customer_name ||
    customer.company_name ||
    customer.name ||
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
    "";

  const paymentDate =
    col.payment_date || col.date || col.createdOn || col.createdAt || "";

  return {
    id: col._id,
    receiptNo:
      col.receipt_no ||
      col.receiptNo ||
      col.payment_receipt_no ||
      col.paymentReceiptNo ||
      col.receipt_number ||
      "-",

    invoiceNo: col.invoice_no || (col.invoice_ids && col.invoice_ids[0]) || "-",

    invoiceIds: col.invoice_ids || [],

    date: paymentDate,

    createdAt: col.createdAt || col.created_on || col.createdOn || "",

    methodRaw: rawMethod,
    method: normalizeMethod(rawMethod),

    customerName,

    customerId: customer._id || col.customer_id || col.client_id || "",

    remarks: col.remarks || col.remark || col.note || col.payment_remarks || "",

    amount: Number(col.amount || 0),

    dateGroup: dateGroupFor(paymentDate),
  };
};

// ─── Method filter dropdown ────────────────────────────────────────────────
// Sits in the Header's right area. Options are "All Payments" plus the three
// canonical methods; "all" stays the default.

const DROPDOWN_OPTIONS = [
  { key: "all", label: "All Payments", icon: "wallet-outline", color: colors.primary },
  ...METHOD_KEYS.map((k) => ({ key: k, ...METHOD_META[k] })),
];

function MethodDropdown({ value, totals, onChange }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null); // { x, y, width, height } of the trigger, in screen coords
  const triggerRef = useRef(null);
  const current = DROPDOWN_OPTIONS.find((o) => o.key === value) || DROPDOWN_OPTIONS[0];
  const currentTotal = (totals[value] || { total: 0 }).total;

  const openMenu = () => {
    // Measure the trigger's on-screen position so the menu can be placed
    // directly below it, right-edge aligned, instead of floating in a
    // fixed corner of the screen.
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const screenWidth = Dimensions.get("window").width;
  const menuStyle = anchor
    ? {
        position: "absolute",
        top: anchor.y + anchor.height + 8,
        right: Math.max(spacing.lg, screenWidth - (anchor.x + anchor.width)),
      }
    : null;

  return (
    <>
      <View style={styles.dropdownWrap}>
        <View style={styles.dropdownTotalBlock}>
          <Text style={styles.dropdownTotalLabel}>{current.label} Total</Text>
          <Text style={styles.dropdownTotalAmount}>{"\u20B9"}{money(currentTotal)}</Text>
        </View>

        <TouchableOpacity
          ref={triggerRef}
          style={styles.dropdownTrigger}
          activeOpacity={0.75}
          onPress={openMenu}
        >
          <MaterialCommunityIcons name={current.icon} size={16} color={current.color} />
          <Text style={styles.dropdownTriggerText}>{current.label}</Text>
          <Feather name="chevron-down" size={16} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setOpen(false)}>
          <View style={[styles.dropdownMenu, menuStyle]}>
            {DROPDOWN_OPTIONS.map((opt) => {
              const t = totals[opt.key] || { total: 0, count: 0 };
              const isActive = opt.key === value;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                  activeOpacity={0.75}
                  onPress={() => {
                    onChange(opt.key);
                    setOpen(false);
                  }}
                >
                  <View style={styles.dropdownItemLeft}>
                    <MaterialCommunityIcons name={opt.icon} size={17} color={opt.color} />
                    <Text
                      style={[
                        styles.dropdownItemLabel,
                        isActive && { color: opt.color, fontWeight: "700" },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  <View style={styles.dropdownItemRight}>
                    <Text style={styles.dropdownItemAmount}>{"\u20B9"}{money(t.total)}</Text>
                    <Text style={styles.dropdownItemCount}>
                      {t.count} payment{t.count === 1 ? "" : "s"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Payment list row ────────────────────────────────────────────────────
// Memoized: with a stable `onPress` (see PaymentsScreen's
// handleSelectPayment) and a stable per-row identity, a row only
// re-renders when its own `payment` or `isActive` prop actually changes.
const PaymentListRow = React.memo(function PaymentListRow({ payment, isActive, onPress }) {
  const meta = METHOD_META[payment.method];
  return (
    <TouchableOpacity
      style={[styles.listRow, isActive && styles.listRowActive]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.listRowTopLine}>
        <Text style={styles.listRowId} numberOfLines={1}>
          {payment.customerName || "Walk-in Customer"}
        </Text>
        <Text style={styles.listRowAmount}>{"\u20B9"}{money(payment.amount)}</Text>
      </View>
      <View style={styles.listRowBottomLine}>
        <Text style={styles.listRowSub} numberOfLines={1}>
          Invoice: {payment.invoiceNo}
          {payment.customerName ? ` · ${payment.customerName}` : ""}
        </Text>
      </View>
      <View style={styles.listRowFooterLine}>
        <View
          style={[
            styles.methodChip,
            { backgroundColor: `${meta.color}1A`, borderColor: `${meta.color}40` },
          ]}
        >
          <MaterialCommunityIcons name={meta.icon} size={13} color={meta.color} />
          <Text style={[styles.methodChipText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Payment detail panel ────────────────────────────────────────────────

function PaymentDetail({ payment }) {
  if (!payment) {
    return (
      <View style={styles.emptyDetail}>
        <MaterialCommunityIcons name="receipt" size={56} color={colors.textMuted} />
        <Text style={styles.emptyDetailText}>Select a payment to view details</Text>
      </View>
    );
  }

  const meta = METHOD_META[payment.method];

  return (
    <ScrollView
      style={styles.detailScroll}
      contentContainerStyle={styles.detailContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.detailHeaderRow}>
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={styles.detailReceiptNo} numberOfLines={1}>
            {payment.customerName || "Walk-in Customer"}
          </Text>
          <Text style={styles.detailInvoiceNo}>Invoice: {payment.invoiceNo}</Text>
          {payment.customerName ? (
            <Text style={styles.detailCustomer}>{payment.customerName}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.detailAmount}>{"\u20B9"}{money(payment.amount)}</Text>
          <Text style={styles.detailDate}>{formatDate(payment.date)}</Text>
        </View>
      </View>

      <View
        style={[
          styles.detailMethodBadge,
          { backgroundColor: `${meta.color}1A`, borderColor: `${meta.color}40` },
        ]}
      >
        <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
        <Text style={[styles.detailMethodText, { color: meta.color }]}>
          Paid via {meta.label}
        </Text>
      </View>

      {/* Payment Details — shown directly on the page, not inside a card */}
      <Text style={styles.sectionHeading}>Payment Details</Text>
      {payment.customerName ? (
        <View style={styles.plainRow}>
          <Text style={styles.plainRowLabel}>Customer</Text>
          <Text style={styles.plainRowValue}>{payment.customerName}</Text>
        </View>
      ) : null}
      <View style={styles.plainRow}>
        <Text style={styles.plainRowLabel}>Payment Method</Text>
        <Text style={styles.plainRowValue}>{payment.methodRaw}</Text>
      </View>

      <View style={[styles.plainRow, styles.plainRowLast]}>
        <Text style={styles.plainRowLabel}>Invoice No.</Text>
        <Text style={styles.plainRowValue}>{payment.invoiceNo}</Text>
      </View>

      {payment.remarks ? (
        <>
          <Text style={styles.sectionHeading}>Remarks</Text>
          <Text style={styles.remarksText}>{payment.remarks}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const CACHE_KEYS = {
  payments: "payments:screen:list:v2",
};

const SUMMARY_PANEL_WIDTH = 380;

export default function PaymentsScreen({ onMenuPress = () => {} }) {
  // ── Payment list date filter (null = show all dates) ───────────────
  // Completely independent from the Daily Payment Summary date below.
  const [listDate, setListDate] = useState(() => new Date());

  // ── Daily Payment Summary date (independent of the payment list) ───
  const [summaryDate, setSummaryDate] = useState(() => new Date());
  const [dailySummaryVisible, setDailySummaryVisible] = useState(false);
  // Cash / UPI / Card totals dropdown inside the summary panel (closed by default)
  const [totalsOpen, setTotalsOpen] = useState(false);

  // ── Shared calendar popup ──────────────────────────────────────────
  // pickerTarget decides which filter the popup edits: "list" | "summary"
  const [pickerTarget, setPickerTarget] = useState("list");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => new Date());

  // ── Side panel animation ───────────────────────────────────────────
  const summaryPanelAnim = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = shown

  useEffect(() => {
    Animated.timing(summaryPanelAnim, {
      toValue: dailySummaryVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [dailySummaryVisible]);

  const summaryPanelTranslateX = summaryPanelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SUMMARY_PANEL_WIDTH, 0],
  });

  const [payments, setPayments] = useState(
    () => getCachedSync(CACHE_KEYS.payments)?.data || []
  );
  const [loading, setLoading] = useState(
    () => !getCachedSync(CACHE_KEYS.payments)?.data
  );
  const [error, setError] = useState(null);

  // Drives ONLY the native pull-to-refresh spinner, mirroring OrdersScreen.
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [activeMethod, setActiveMethod] = useState("all"); // 'all' | 'cash' | 'upi' | 'card'
  const [activePaymentId, setActivePaymentId] = useState(
    () => getCachedSync(CACHE_KEYS.payments)?.data?.[0]?.id || null
  );

  const searchInputRef = useRef(null);

  // `silent` = true means "I already have something on screen (from cache
  // or a previous fetch) — refresh quietly without flashing the big
  // full-pane spinner." The list stays interactive the whole time.
  const fetchPayments = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await API.get("/payments", { headers });
      const data = res.data.data || res.data || [];

      const mapped = data.map(mapPayment).sort((a, b) => {
        // Newest payment date first
        const dateCompare = new Date(b.date || 0) - new Date(a.date || 0);
        if (dateCompare !== 0) return dateCompare;

        // Same payment date → newest created payment first
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      setPayments(mapped);
      setActivePaymentId((prev) => prev || (mapped[0] ? mapped[0].id : null));

      // Persist for next time the screen opens.
      setCached(CACHE_KEYS.payments, mapped);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load payments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Wrapper used ONLY by pull-to-refresh.
  const handlePullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await fetchPayments({ silent: true });
    } finally {
      setPullRefreshing(false);
    }
  }, [fetchPayments]);

  // Mount effect — runs once per mount (see OrdersScreen for the full
  // explanation of the cache-first / silent-refresh strategy).
  useEffect(() => {
    let active = true;

    (async () => {
      if (payments.length > 0) {
        fetchPayments({ silent: true });
      } else {
        const cachedPayments = await getCached(CACHE_KEYS.payments);
        if (active && cachedPayments?.data) {
          setPayments(cachedPayments.data);
          setActivePaymentId((prev) => prev || (cachedPayments.data[0]?.id ?? null));
          setLoading(false);
        }
        fetchPayments({ silent: !!cachedPayments?.data });
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // List filters: date (listDate) + search. The method dropdown is applied
  // afterwards so its per-method totals always reflect the selected date
  // and search text, but not the currently selected method.
  const searchFilteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    const selectedDateKey = listDate ? dateKey(listDate) : "";

    return payments.filter((p) => {
      // Date filter
      if (selectedDateKey && paymentDateKey(p.date) !== selectedDateKey) {
        return false;
      }

      // Search filter
      if (!q) return true;
      return (
        (p.receiptNo || "").toLowerCase().includes(q) ||
        (p.invoiceNo || "").toLowerCase().includes(q) ||
        (p.customerName || "").toLowerCase().includes(q)
      );
    });
  }, [payments, search, listDate]);

  const methodTotals = useMemo(() => {
    const totals = { all: { total: 0, count: 0 } };
    [...METHOD_KEYS, "other"].forEach((k) => (totals[k] = { total: 0, count: 0 }));
    searchFilteredPayments.forEach((p) => {
      totals.all.total += p.amount;
      totals.all.count += 1;
      totals[p.method].total += p.amount;
      totals[p.method].count += 1;
    });
    return totals;
  }, [searchFilteredPayments]);

  const visiblePayments = useMemo(() => {
    if (activeMethod === "all") return searchFilteredPayments;
    return searchFilteredPayments.filter((p) => p.method === activeMethod);
  }, [searchFilteredPayments, activeMethod]);

  // If the selected payment gets filtered out, clear the detail pane.
  useEffect(() => {
    if (activePaymentId && !visiblePayments.some((p) => p.id === activePaymentId)) {
      setActivePaymentId(null);
    }
  }, [visiblePayments, activePaymentId]);

  const groupedPayments = useMemo(() => {
    const groups = {};
    visiblePayments.forEach((p) => {
      if (!groups[p.dateGroup]) groups[p.dateGroup] = [];
      groups[p.dateGroup].push(p);
    });
    return groups;
  }, [visiblePayments]);

  const groupLabels = useMemo(() => Object.keys(groupedPayments), [groupedPayments]);

  const activePayment = payments.find((p) => p.id === activePaymentId) || null;

  const handleSelectPayment = useCallback((id) => {
    setActivePaymentId(id);
  }, []);

  // ── Daily Payment Summary data ─────────────────────────────────────
  // Built from the already-loaded `payments` array for `summaryDate`.
  // Unaffected by the list's date filter, search text or method dropdown.
  const dailySummaryPayments = useMemo(() => {
    const key = dateKey(summaryDate);
    return payments.filter((p) => paymentDateKey(p.date) === key);
  }, [payments, summaryDate]);

  const dailySummaryTotals = useMemo(() => {
    const t = {
      cash: { total: 0, count: 0 },
      upi: { total: 0, count: 0 },
      card: { total: 0, count: 0 },
      other: { total: 0, count: 0 },
      all: { total: 0, count: 0 },
    };
    dailySummaryPayments.forEach((p) => {
      t[p.method].total += p.amount;
      t[p.method].count += 1;
      t.all.total += p.amount;
      t.all.count += 1;
    });
    return t;
  }, [dailySummaryPayments]);

  // ── Calendar picker handlers ───────────────────────────────────────
  const openPicker = (target) => {
    setPickerTarget(target);
    setPickerMonth((target === "list" ? listDate : summaryDate) || new Date());
    setPickerVisible(true);
  };

  const handleSelectPickerDate = (d) => {
    if (pickerTarget === "list") setListDate(d);
    else setSummaryDate(d);
    setPickerVisible(false);
  };

  const pickerActiveDate = pickerTarget === "list" ? listDate : summaryDate;

  return (
    <View style={styles.screen}>
      <Header
        title="Payments"
        leftWidth={380}
        onMenuPress={onMenuPress}
        searchInputRef={searchInputRef}
        searchValue={search}
        onSearchChange={setSearch}
        hideScanner
        hideCustomer
        hideHeldCarts
        hideViewHeldCarts
        hideMore
        rightExtra={
          <View style={styles.headerRightRow}>
            <MethodDropdown value={activeMethod} totals={methodTotals} onChange={setActiveMethod} />

            <TouchableOpacity
              style={styles.dailySummaryTriggerBtn}
              onPress={() => setDailySummaryVisible((v) => !v)}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="calendar-text-outline" size={18} color={colors.white} />
              <Text style={styles.dailySummaryTriggerText}>Daily Summary</Text>
              <MaterialCommunityIcons
                name={dailySummaryVisible ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.white}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.body}>
        {/* Left pane — filtered list */}
        <View style={styles.listPane}>
          {/* ── Payment list date filter ── */}
          <View style={styles.listFilterBar}>
            <TouchableOpacity
              style={styles.listFilterChip}
              onPress={() => openPicker("list")}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="calendar" size={18} color={colors.primary} />
              <Text style={styles.listFilterText}>
                {listDate ? formatDateLong(listDate) : "All dates"}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setListDate(listDate ? null : new Date())}
              hitSlop={8}
            >
              <Text style={styles.listFilterAction}>{listDate ? "Show all" : "Today"}</Text>
            </TouchableOpacity>
          </View>

          {loading && payments.length === 0 ? (
            // First ever load, nothing cached yet — full-pane spinner.
            <View style={styles.emptyList}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.emptyListText, { marginTop: 10 }]}>Loading payments…</Text>
            </View>
          ) : error && payments.length === 0 ? (
            // Failed with nothing to fall back on — show the retry state.
            <View style={styles.emptyList}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPayments()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={pullRefreshing}
                  onRefresh={handlePullRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
            >
              {error ? (
                <View style={styles.inlineErrorBanner}>
                  <Text style={styles.inlineErrorBannerText} numberOfLines={2}>
                    {error}
                  </Text>
                </View>
              ) : null}

              {groupLabels.length === 0 ? (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No payments found</Text>
                </View>
              ) : (
                groupLabels.map((groupLabel) => (
                  <View key={groupLabel}>
                    <Text style={styles.groupLabel}>{groupLabel}</Text>
                    {groupedPayments[groupLabel].map((payment) => (
                      <PaymentListRow
                        key={payment.id}
                        payment={payment}
                        isActive={payment.id === activePaymentId}
                        onPress={() => handleSelectPayment(payment.id)}
                      />
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>

        {/* Right pane — detail */}
        <View style={styles.detailPane}>
          <PaymentDetail payment={activePayment} />
        </View>
      </View>

      {/* ── Shared date picker (payment list + daily summary) ── */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>
              {pickerTarget === "list" ? "Filter payments by date" : "Daily summary date"}
            </Text>

            <View style={styles.pickerHeader}>
              <TouchableOpacity
                hitSlop={8}
                onPress={() =>
                  setPickerMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                }
              >
                <MaterialCommunityIcons name="chevron-left" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.pickerMonthLabel}>
                {pickerMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </Text>
              <TouchableOpacity
                hitSlop={8}
                onPress={() =>
                  setPickerMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                }
              >
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerWeekRow}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <Text key={i} style={styles.pickerWeekDay}>{d}</Text>
              ))}
            </View>

            <View style={styles.pickerGrid}>
              {getCalendarCells(pickerMonth).map((cell, idx) => {
                if (!cell) return <View key={idx} style={styles.pickerCell} />;
                const isSelected =
                  !!pickerActiveDate && dateKey(cell) === dateKey(pickerActiveDate);
                const isToday = dateKey(cell) === dateKey(new Date());
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.pickerCell, isSelected && styles.pickerCellSelected]}
                    onPress={() => handleSelectPickerDate(cell)}
                  >
                    <Text
                      style={[
                        styles.pickerCellText,
                        isToday && styles.pickerCellTextToday,
                        isSelected && styles.pickerCellTextSelected,
                      ]}
                    >
                      {cell.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.pickerTodayBtn}
              onPress={() => handleSelectPickerDate(new Date())}
            >
              <Text style={styles.pickerTodayBtnText}>Today</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Daily Payment Summary side panel ── */}
      {dailySummaryVisible && (
        <TouchableOpacity
          style={styles.dailySummaryBackdrop}
          activeOpacity={1}
          onPress={() => setDailySummaryVisible(false)}
        />
      )}

      <Animated.View
        pointerEvents={dailySummaryVisible ? "auto" : "none"}
        style={[
          styles.dailySummaryPanel,
          { width: SUMMARY_PANEL_WIDTH, transform: [{ translateX: summaryPanelTranslateX }] },
        ]}
      >
        <SafeAreaView edges={["top", "right", "bottom"]} style={{ flex: 1 }}>
          <View style={styles.dailySummaryHeaderRow}>
            <Text style={styles.dailySummaryTitle}>Daily Payment Summary</Text>
            <TouchableOpacity onPress={() => setDailySummaryVisible(false)} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.dailySummaryDateRow}>
            <View style={styles.dailySummaryDateLeft}>
              <MaterialCommunityIcons name="calendar" size={18} color={colors.primary} />
              <Text style={styles.dailySummaryDateText}>{formatDateLong(summaryDate)}</Text>
            </View>
            <TouchableOpacity
              style={styles.dailySummaryChangeBtn}
              onPress={() => openPicker("summary")}
            >
              <Text style={styles.dailySummaryChangeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

<View style={styles.dailySummaryActionRow}>
  <TouchableOpacity
    style={styles.dailySummaryPrintBtn}
    onPress={() => {}}
  >
    <MaterialCommunityIcons
      name="printer-outline"
      size={17}
      color={colors.primary}
    />
    <Text style={styles.dailySummaryPrintBtnText}>Print</Text>
  </TouchableOpacity>
</View>

          <View style={[styles.dailySummaryBody, { flex: 1 }]}>
            {dailySummaryPayments.length === 0 ? (
              <Text style={styles.dailySummaryEmptyText}>No payments found for this date.</Text>
            ) : (
              <>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {dailySummaryPayments.map((p) => {
                    const meta = METHOD_META[p.method];
                    return (
                      <View key={p.id} style={styles.dailySummaryItemRow}>
                        <Text style={styles.dailySummaryItemName} numberOfLines={1}>
                          {p.customerName || "Walk-in Customer"}
                        </Text>
                        <View style={styles.dailySummaryItemBottomLine}>
                          <View style={styles.dailySummaryMethodWrap}>
                            <MaterialCommunityIcons name={meta.icon} size={13} color={colors.textMuted} />
                            <Text style={styles.dailySummaryItemSub}>{meta.label}</Text>
                            <Text style={styles.dailySummaryItemSub} numberOfLines={1}>
                              {" · "}Inv: {p.invoiceNo}
                            </Text>
                          </View>
                          <Text style={styles.dailySummaryItemAmount}>
                            {"\u20B9"}{money(p.amount)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Totals dropdown — closed by default, opens upward from the
                    bottom of the panel. Neutral colors only. */}
                <View style={styles.dailySummaryTotalsBox}>
                  {totalsOpen && (
                    <View style={styles.totalsDropdownBody}>
                      {[...METHOD_KEYS, ...(dailySummaryTotals.other.count > 0 ? ["other"] : [])].map((k) => {
                        const meta = METHOD_META[k];
                        const t = dailySummaryTotals[k];
                        return (
                          <View key={k} style={styles.dailySummaryTotalsRow}>
                            <View style={styles.dailySummaryTotalsLabelWrap}>
                              <MaterialCommunityIcons name={meta.icon} size={15} color={colors.textSecondary} />
                              <Text style={styles.dailySummaryTotalsLabel}>
                                {meta.label.toUpperCase()}
                              </Text>
                              <Text style={styles.dailySummaryTotalsCount}>({t.count})</Text>
                            </View>
                            <Text style={styles.dailySummaryTotalsValue}>
                              {"\u20B9"}{money(t.total)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.totalsDropdownTrigger}
                    activeOpacity={0.75}
                    onPress={() => setTotalsOpen((v) => !v)}
                  >
                    <View style={styles.dailySummaryTotalsLabelWrap}>
                      <MaterialCommunityIcons name="wallet-outline" size={18} color={colors.textPrimary} />
                      <View>
                        <Text style={styles.dailySummaryGrandLabel}>TOTAL RECEIVED</Text>
                        <Text style={styles.totalsDropdownSub}>Cash · UPI · Card</Text>
                      </View>
                    </View>
                    <View style={styles.dailySummaryTotalsLabelWrap}>
                      <Text style={styles.dailySummaryGrandValue}>
                        {"\u20B9"}{money(dailySummaryTotals.all.total)}
                      </Text>
                      <Feather
                        name={totalsOpen ? "chevron-down" : "chevron-up"}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, flexDirection: "row" },

  headerRightRow: { flexDirection: "row", alignItems: "center", gap: 14 },

  // ── Method filter dropdown (in Header) ───────────────────────────────
  dropdownWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dropdownTotalBlock: {
    alignItems: "flex-end",
  },
  dropdownTotalLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
  },
  dropdownTotalAmount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md || 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dropdownTriggerText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.25)",
  },
  dropdownMenu: {
    width: 280,
    backgroundColor: colors.white,
    borderRadius: radii.lg || 14,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownItemActive: { backgroundColor: colors.primarySoft },
  dropdownItemLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dropdownItemLabel: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  dropdownItemRight: { alignItems: "flex-end" },
  dropdownItemAmount: { fontSize: 14.5, fontWeight: "800", color: colors.textPrimary },
  dropdownItemCount: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

  // ── Left pane ─────────────────────────────────────────────────────────
  listPane: {
    width: 380,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
    backgroundColor: "#F8FAFC",
  },

  // ── Payment list date filter bar ──
  listFilterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  listFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "#F8FAFC",
  },
  listFilterText: { fontSize: 14.5, fontWeight: "700", color: colors.textPrimary },
  listFilterAction: { fontSize: 13.5, fontWeight: "700", color: colors.primary },

  groupLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.3,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: "#F1F5F9",
  },
  listRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 8,
  },
  listRowActive: { backgroundColor: colors.primarySoft },
  listRowTopLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listRowId: { fontSize: 17, fontWeight: "800", color: colors.textPrimary, flex: 1, paddingRight: 10 },
  listRowAmount: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },
  listRowBottomLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listRowSub: { fontSize: 14.5, color: colors.textSecondary, flex: 1 },
  listRowFooterLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  listRowTime: { fontSize: 12.5, color: colors.textMuted },
  methodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.sm || 8,
    borderWidth: 1,
  },
  methodChipText: { fontSize: 12, fontWeight: "700" },

  emptyList: { padding: spacing.xl, alignItems: "center" },
  emptyListText: { fontSize: 15, color: colors.textMuted },
  errorText: { fontSize: 15, color: "#DC2626", textAlign: "center", marginBottom: 14 },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 24,
    borderRadius: radii.md,
  },
  retryBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  inlineErrorBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  inlineErrorBannerText: { fontSize: 12.5, color: "#DC2626", fontWeight: "600" },

  // ── Right pane / detail ───────────────────────────────────────────────
  detailPane: { flex: 1 },
  detailScroll: { flex: 1 },
  detailContent: { padding: spacing.xl, paddingBottom: spacing.xl * 1.5 },

  detailHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  detailReceiptNo: { fontSize: 24, fontWeight: "800", color: colors.textPrimary },
  detailInvoiceNo: { fontSize: 16, color: colors.textSecondary, marginTop: 5 },
  detailCustomer: { fontSize: 14.5, color: colors.textMuted, marginTop: 2 },
  detailAmount: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  detailDate: { fontSize: 14, color: colors.textMuted, marginTop: 5 },

  detailMethodBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  detailMethodText: { fontSize: 15, fontWeight: "700" },

  sectionHeading: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  plainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  plainRowLast: { borderBottomWidth: 0 },
  plainRowLabel: { fontSize: 15, color: colors.textSecondary },
  plainRowValue: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },

  remarksText: { fontSize: 15, color: colors.textPrimary, lineHeight: 22, paddingVertical: 10 },

  emptyDetail: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyDetailText: { fontSize: 16, color: colors.textMuted },

  // ── Shared date picker modal ────────────────────────────────────────
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerCard: {
    width: 320,
    backgroundColor: colors.white,
    borderRadius: radii.lg || 16,
    padding: spacing.lg,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 10,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pickerMonthLabel: { fontSize: 15.5, fontWeight: "700", color: colors.textPrimary },
  pickerWeekRow: { flexDirection: "row", marginBottom: 4 },
  pickerWeekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap" },
  pickerCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerCellSelected: {
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  pickerCellText: { fontSize: 14, color: colors.textPrimary },
  pickerCellTextToday: { fontWeight: "800", color: colors.primary },
  pickerCellTextSelected: { color: colors.white, fontWeight: "800" },
  pickerTodayBtn: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pickerTodayBtnText: { fontSize: 13.5, fontWeight: "700", color: colors.primary },

  // ── Header trigger button ──
  dailySummaryTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  dailySummaryTriggerText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },

  // ── Daily Payment Summary side panel ────────────────────────────────
  dailySummaryBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 40,
  },
  dailySummaryPanel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: colors.white,
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 50,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  dailySummaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dailySummaryTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  dailySummaryDateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  dailySummaryDateLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dailySummaryDateText: { fontSize: 14.5, fontWeight: "700", color: colors.textPrimary },
  dailySummaryChangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm || 8,
    backgroundColor: colors.primarySoft || "#EEF2FF",
  },
  dailySummaryChangeBtnText: { fontSize: 12.5, fontWeight: "700", color: colors.primary },
  dailySummaryBody: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  dailySummaryEmptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 16,
  },
  dailySummaryItemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 3,
  },
  dailySummaryItemName: { fontSize: 13.5, fontWeight: "700", color: colors.textPrimary },
  dailySummaryItemBottomLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dailySummaryMethodWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    paddingRight: 8,
  },
  dailySummaryItemSub: { fontSize: 12.5, color: colors.textMuted, fontWeight: "600" },
  dailySummaryItemAmount: { fontSize: 13.5, fontWeight: "800", color: colors.textPrimary },

  dailySummaryTotalsBox: {
    marginTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: colors.divider,
  },
  totalsDropdownBody: {
    paddingTop: 10,
    paddingHorizontal: 4,
    gap: 10,
  },
  totalsDropdownTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: "#F8FAFC",
  },
  totalsDropdownSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  dailySummaryTotalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dailySummaryTotalsLabelWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  dailySummaryTotalsLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  dailySummaryTotalsCount: { fontSize: 12, color: colors.textMuted },
  dailySummaryTotalsValue: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  dailySummaryGrandLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  dailySummaryGrandValue: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
dailySummaryPrintBtn: {
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",
  gap: 5,
  paddingHorizontal: 8,
  paddingVertical: 6,
  borderRadius: radii.sm || 7,
  borderWidth: 1,
  borderColor: colors.primary,
},
    dailySummaryPrintBtnText: { fontSize: 13.5, fontWeight: "700", color: colors.primary },
});