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
} from "react-native";

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

const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  const d = new Date(isoDate);
  if (isNaN(d)) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatTime = (isoDate) => {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  return {
    id: col._id,
    receiptNo: col.receipt_no || "-",
    invoiceNo: col.invoice_no || (col.invoice_ids && col.invoice_ids[0]) || "-",
    invoiceIds: col.invoice_ids || [],
    date: col.date || col.payment_date || col.createdOn || col.createdAt || "",
    methodRaw: rawMethod,
    method: normalizeMethod(rawMethod),
    customerName: col.customer_name || (col.client_id && col.client_id.first_name) || "",
    remarks: col.remarks || col.note || "",
    amount: Number(col.amount || 0),
    dateGroup: dateGroupFor(col.date || col.payment_date || col.createdOn || col.createdAt),
  };
};

// ─── Method filter dropdown (replaces the old tab bar) ─────────────────────
// Sits in the Header's left area, right next to "Payments". Options are
// "All Payments" plus the three canonical methods; "all" stays the default.

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
// re-renders when its own `payment` or `isActive` prop actually changes —
// not on every keystroke in search or every method-dropdown change.
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
          {payment.receiptNo}
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
        <Text style={styles.listRowTime}>{formatDate(payment.date)} · {formatTime(payment.date)}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── Payment detail panel ────────────────────────────────────────────────
// Single "Overview" tab, styled the same way OrderDetail's tab row is
// styled on OrdersScreen. Everything that used to sit inside a bordered
// "card" box now sits directly on the page as plain label/value rows.

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
          <Text style={styles.detailReceiptNo}>{payment.receiptNo}</Text>
          <Text style={styles.detailInvoiceNo}>Invoice: {payment.invoiceNo}</Text>
          {payment.customerName ? (
            <Text style={styles.detailCustomer}>{payment.customerName}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.detailAmount}>{"\u20B9"}{money(payment.amount)}</Text>
          <Text style={styles.detailDate}>{formatDate(payment.date)} · {formatTime(payment.date)}</Text>
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
      <View style={styles.plainRow}>
        <Text style={styles.plainRowLabel}>Receipt No.</Text>
        <Text style={styles.plainRowValue}>{payment.receiptNo}</Text>
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

// ─── PaymentsScreen ─────────────────────────────────────────────────────────

// Cache key — separate namespace from OrdersScreen's "payments:list:v1"
// because the two screens map raw payment records into DIFFERENT shapes
// (this screen adds methodRaw/method/customerName/dateGroup that
// OrdersScreen's mapPayment doesn't produce). Bump the version suffix if
// the shape of what's stored here ever changes, so a stale cached payload
// from a previous app version doesn't get force-fed into new state shapes.
const CACHE_KEYS = {
  payments: "payments:screen:list:v1",
};

export default function PaymentsScreen({ onMenuPress = () => {} }) {
  // ── Instant paint from the in-memory cache ────────────────────────────
  // getCachedSync only checks the in-memory Map in utils/cache.js (no
  // AsyncStorage round-trip), so if this screen has been visited before in
  // the current app session — including "navigated away and came back" —
  // these lazy initializers already have the last-known data the very
  // first time this component renders. No blank list, no spinner flash.
  //
  // On a genuinely cold app launch the in-memory cache is empty, so these
  // fall back to empty array / true-loading, and the mount effect below
  // does the one-time async disk read (getCached) to paint from
  // AsyncStorage instead — same pattern as OrdersScreen.
  const [payments, setPayments] = useState(
    () => getCachedSync(CACHE_KEYS.payments)?.data || []
  );
  const [loading, setLoading] = useState(
    () => !getCachedSync(CACHE_KEYS.payments)?.data
  );
  const [error, setError] = useState(null);

  // Drives ONLY the native pull-to-refresh spinner, mirroring OrdersScreen.
  // The automatic background sync on mount never touches this — it only
  // flips on when the user physically pulls the list down themselves.
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [activeMethod, setActiveMethod] = useState("all"); // 'all' | 'cash' | 'upi' | 'card' — defaults to all
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
      const res = await API.get("/payment-in", { headers });
      const data = res.data.data || res.data || [];
      const mapped = data
        .map(mapPayment)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setPayments(mapped);
      setActivePaymentId((prev) => prev || (mapped[0] ? mapped[0].id : null));

      // Persist for next time the screen opens — next visit paints
      // instantly from this instead of showing a blank loader.
      setCached(CACHE_KEYS.payments, mapped);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load payments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Wrapper used ONLY by pull-to-refresh. This is the one place
  // `pullRefreshing` gets set — the automatic background sync on mount
  // calls fetchPayments directly and never touches this.
  const handlePullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await fetchPayments({ silent: true });
    } finally {
      setPullRefreshing(false);
    }
  }, [fetchPayments]);

  // Mount effect — runs once per mount.
  //
  // If the lazy initializer above already found data in the in-memory
  // cache (screen was visited earlier this session), `payments` is
  // non-empty on this very first render, so we skip the async disk read
  // entirely and go straight to a SILENT background refresh — the user
  // sees their data immediately with zero loading state.
  //
  // Only on a genuinely cold start (in-memory cache empty) do we fall back
  // to the async, disk-backed getCached(), and only then decide whether
  // the subsequent fetch should be silent or show the full-pane spinner.
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
    // Intentionally only on mount: `payments` is read here only to decide
    // the very first fetch's silent/loud behavior, not to re-trigger this
    // effect as it changes afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Totals per method, computed once from the full (unfiltered-by-method) list
  // so the dropdown always shows true totals regardless of which option is
  // currently selected. Search text still narrows them.
  // "all" still includes "other"-bucketed payments even though "other" has
  // no option of its own — nothing is silently dropped from totals or the list.
  const searchFilteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (p) =>
        (p.receiptNo || "").toLowerCase().includes(q) ||
        (p.invoiceNo || "").toLowerCase().includes(q) ||
        (p.customerName || "").toLowerCase().includes(q)
    );
  }, [payments, search]);

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

  const groupedPayments = useMemo(() => {
    const groups = {};
    visiblePayments.forEach((p) => {
      if (!groups[p.dateGroup]) groups[p.dateGroup] = [];
      groups[p.dateGroup].push(p);
    });
    return groups;
  }, [visiblePayments]);

const groupLabels = useMemo(
  () => Object.keys(groupedPayments),
  [groupedPayments]
);

  const activePayment = payments.find((p) => p.id === activePaymentId) || null;

  // Stable row-select handler, mirrors OrdersScreen's handleSelectOrder —
  // paired with React.memo on PaymentListRow this keeps row re-renders
  // scoped to just the previously/now active row instead of the whole list.
  const handleSelectPayment = useCallback((id) => {
    setActivePaymentId(id);
  }, []);

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
        rightExtra={<MethodDropdown value={activeMethod} totals={methodTotals} onChange={setActiveMethod} />}
      />

      <View style={styles.body}>
        {/* Left pane — filtered list */}
        <View style={styles.listPane}>
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
              {/* If a background refresh fails but we still have cached/
                  stale data on screen, don't blank the list — just show a
                  small inline notice above it. */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, flexDirection: "row" },

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
    // Sits on the dark navy Header, so this needs to be light-on-dark,
    // not the light-background styling used elsewhere on this screen.
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

  // Plain label/value rows placed directly on the page (no bordered card
  // wrapper around them) — separated only by a hairline under each row.
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
});