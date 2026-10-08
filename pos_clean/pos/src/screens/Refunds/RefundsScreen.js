import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import API from "../../api/axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  COLORS as colors,
  RADIUS as radii,
  SPACING as spacing,
} from "../../components/Colors";
import Header from "../../components/Header";
// Same shared cache module used by OrdersScreen / PaymentsScreen — see
// utils/cache.js for how the sync/async split works.
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

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dateGroupFor = (isoDate) => {
  if (!isoDate) return "OLDER";
  const d = new Date(isoDate);
  if (isNaN(d)) return "OLDER";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return "TODAY";
  if (isSameDay(d, yesterday)) return "YESTERDAY";
  return "OLDER";
};

const GROUP_ORDER = ["TODAY", "YESTERDAY", "OLDER"];

const mapReturn = (ret) => {
  const customer = ret.client_id || {};
  const order = ret.sales_id || {};

  const customerName =
    customer.first_name || customer.last_name
      ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
      : customer.company_name || "Walk-in";

  const items = (ret.details || []).map((d, idx) => {
    const qty = Number(d.qty || d.bags || d.units || 0);
    const rate = Number(d.price || d.rate || 0);
    const amount = Number(d.amount) > 0 ? Number(d.amount) : qty * rate;
    return {
      id: d._id || `${ret._id}-${idx}`,
      name: d.product_name || d.name || d.item_name || "Item",
      qty,
      rate,
      amount,
    };
  });

  return {
    id: ret._id,
    returnNo: ret.return_no || "—",
    invoiceNo: order.invoice_no || "—",
    customer: customerName,
    companyName: customer.company_name || "",
    total: Number(ret.total_amount || 0),
    date: ret.createdAt || "",
    dateGroup: dateGroupFor(ret.createdAt),
    items,
  };
};

// Memoized: with a stable `onPress` (see RefundsScreen's
// handleSelectRefund) and a stable per-row identity, a row only
// re-renders when its own `refund` or `isActive` prop actually changes —
// not on every keystroke in search or unrelated screen re-renders.
const RefundListRow = React.memo(function RefundListRow({ refund, isActive, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.listRow, isActive && styles.listRowActive]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.listRowTopLine}>
        <Text style={styles.listRowId} numberOfLines={1}>{refund.returnNo}</Text>
        <Text style={styles.listRowAmount}>{"\u2212\u20B9"}{money(refund.total)}</Text>
      </View>
      <View style={styles.listRowBottomLine}>
        <Text style={styles.listRowCustomer} numberOfLines={1}>
          {refund.customer}
          {refund.invoiceNo !== "—" ? ` · from ${refund.invoiceNo}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

function RefundDetail({ refund }) {
  if (!refund) {
    return (
      <View style={styles.emptyDetail}>
        <MaterialCommunityIcons name="cash-refund" size={56} color={colors.textMuted} />
        <Text style={styles.emptyDetailText}>Select a refund to view details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
      <View style={styles.detailHeaderRow}>
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={styles.detailOrderId}>{refund.returnNo}</Text>
          <Text style={styles.detailCustomer}>{refund.customer}</Text>
          {refund.invoiceNo !== "—" && (
            <Text style={styles.detailCompany}>Against invoice {refund.invoiceNo}</Text>
          )}
        </View>
        <View style={styles.detailHeaderRight}>
          <Text style={[styles.detailAmount, { color: "#DC2626" }]}>
            {"\u2212\u20B9"}{money(refund.total)}
          </Text>
          <Text style={styles.detailDate}>{formatDate(refund.date)}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeading}>Items Refunded</Text>
      <View style={styles.itemTableCard}>
        {refund.items.length === 0 ? (
          <View style={styles.itEmptyRow}>
            <Text style={styles.itEmptyText}>No item breakdown available.</Text>
          </View>
        ) : (
          refund.items.map((item, idx) => (
            <View
              key={item.id}
              style={[styles.itRow, idx === refund.items.length - 1 && styles.itRowLast]}
            >
              <Text style={[styles.itCell, { flex: 2 }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.itCell, styles.itCenter, { flex: 0.6 }]}>{item.qty}</Text>
              <Text style={[styles.itCell, styles.itRight, { flex: 1 }]}>
                {"\u20B9"}{money(item.rate)}
              </Text>
              <Text style={[styles.itCell, styles.itRight, styles.itBold, { flex: 1 }]}>
                {"\u20B9"}{money(item.amount)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// Cache key — own namespace, separate from OrdersScreen's returns cache
// (which lives nested inside CACHE_KEYS.orders as `{orders, returns}`) and
// from PaymentsScreen's cache. Bump the version suffix if the shape stored
// here ever changes, so a stale cached payload from a previous app version
// doesn't get force-fed into new state shapes.
const CACHE_KEYS = {
  refunds: "refunds:screen:list:v1",
};

export default function RefundsScreen({ onBack = () => {}, onMenuPress = () => {} }) {
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
  // AsyncStorage instead — same pattern as OrdersScreen / PaymentsScreen.
  const [refunds, setRefunds] = useState(
    () => getCachedSync(CACHE_KEYS.refunds)?.data || []
  );
  const [loading, setLoading] = useState(
    () => !getCachedSync(CACHE_KEYS.refunds)?.data
  );
  const [error, setError] = useState(null);

  // Drives ONLY the native pull-to-refresh spinner, mirroring
  // OrdersScreen/PaymentsScreen. The automatic background sync on mount
  // never touches this — it only flips on when the user physically pulls
  // the list down themselves.
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const [activeId, setActiveId] = useState(
    () => getCachedSync(CACHE_KEYS.refunds)?.data?.[0]?.id || null
  );
  const [search, setSearch] = useState("");
  const searchInputRef = useRef(null);

  // `silent` = true means "I already have something on screen (from cache
  // or a previous fetch) — refresh quietly without flashing the big
  // full-pane spinner." The list stays interactive the whole time.
  const fetchRefunds = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await API.get("/sales-return", { headers });
      const data = res.data.data || res.data || [];
      const mapped = data
        .map(mapReturn)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setRefunds(mapped);
      setActiveId((prev) => prev || (mapped[0] ? mapped[0].id : null));

      // Persist for next time the screen opens — next visit paints
      // instantly from this instead of showing a blank loader.
      setCached(CACHE_KEYS.refunds, mapped);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load refunds. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Wrapper used ONLY by pull-to-refresh. This is the one place
  // `pullRefreshing` gets set — the automatic background sync on mount
  // calls fetchRefunds directly and never touches this.
  const handlePullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await fetchRefunds({ silent: true });
    } finally {
      setPullRefreshing(false);
    }
  }, [fetchRefunds]);

  // Mount effect — runs once per mount.
  //
  // If the lazy initializer above already found data in the in-memory
  // cache (screen was visited earlier this session), `refunds` is
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
      if (refunds.length > 0) {
        fetchRefunds({ silent: true });
      } else {
        const cachedRefunds = await getCached(CACHE_KEYS.refunds);
        if (active && cachedRefunds?.data) {
          setRefunds(cachedRefunds.data);
          setActiveId((prev) => prev || (cachedRefunds.data[0]?.id ?? null));
          setLoading(false);
        }
        fetchRefunds({ silent: !!cachedRefunds?.data });
      }
    })();

    return () => {
      active = false;
    };
    // Intentionally only on mount: `refunds` is read here only to decide
    // the very first fetch's silent/loud behavior, not to re-trigger this
    // effect as it changes afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRefunds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return refunds;
    return refunds.filter(
      (r) =>
        (r.returnNo || "").toLowerCase().includes(q) ||
        (r.invoiceNo || "").toLowerCase().includes(q) ||
        (r.customer || "").toLowerCase().includes(q) ||
        (r.companyName || "").toLowerCase().includes(q)
    );
  }, [refunds, search]);

  const grouped = useMemo(() => {
    const g = {};
    filteredRefunds.forEach((r) => {
      if (!g[r.dateGroup]) g[r.dateGroup] = [];
      g[r.dateGroup].push(r);
    });
    return g;
  }, [filteredRefunds]);

  const groupLabels = useMemo(
    () => GROUP_ORDER.filter((g) => grouped[g] && grouped[g].length > 0),
    [grouped]
  );

  const activeRefund = refunds.find((r) => r.id === activeId) || null;

  // Stable row-select handler, mirrors OrdersScreen/PaymentsScreen —
  // paired with React.memo on RefundListRow this keeps row re-renders
  // scoped to just the previously/now active row instead of the whole list.
  const handleSelectRefund = useCallback((id) => {
    setActiveId(id);
  }, []);

  return (
    <View style={styles.screen}>
      <Header
        title="Refunds"
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

      />

      <View style={styles.body}>
        <View style={styles.listPane}>
          {loading && refunds.length === 0 ? (
            // First ever load, nothing cached yet — full-pane spinner.
            <View style={styles.emptyList}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.emptyListText, { marginTop: 10 }]}>Loading refunds…</Text>
            </View>
          ) : error && refunds.length === 0 ? (
            // Failed with nothing to fall back on — show the retry state.
            <View style={styles.emptyList}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRefunds()}>
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
                  <MaterialCommunityIcons name="cash-refund" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyListText}>No refunds yet</Text>
                </View>
              ) : (
                groupLabels.map((label) => (
                  <View key={label}>
                    <Text style={styles.groupLabel}>{label}</Text>
                    {grouped[label].map((refund) => (
                      <RefundListRow
                        key={refund.id}
                        refund={refund}
                        isActive={refund.id === activeId}
                        onPress={() => handleSelectRefund(refund.id)}
                      />
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>

        <View style={styles.detailPane}>
          <RefundDetail refund={activeRefund} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, flexDirection: "row" },

  listPane: {
    width: 380,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
    backgroundColor: "#F8FAFC",
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 10,
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
  listRowAmount: { fontSize: 17, fontWeight: "800", color: "#DC2626" },
  listRowBottomLine: { flexDirection: "row" },
  listRowCustomer: { fontSize: 14.5, color: colors.textSecondary, flex: 1 },
  emptyList: { padding: spacing.xl, alignItems: "center", gap: 10 },
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

  detailPane: { flex: 1 },
  detailScroll: { flex: 1 },
  detailContent: { padding: spacing.xl, paddingBottom: spacing.xl * 1.5 },
  detailHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  detailHeaderRight: { alignItems: "flex-end" },
  detailOrderId: { fontSize: 24, fontWeight: "800", color: colors.textPrimary },
  detailCustomer: { fontSize: 16, color: colors.textSecondary, marginTop: 5 },
  detailCompany: { fontSize: 14.5, color: colors.textMuted, marginTop: 2 },
  detailAmount: { fontSize: 22, fontWeight: "800" },
  detailDate: { fontSize: 14, color: colors.textMuted, marginTop: 5 },
  sectionHeading: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  itemTableCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: radii.lg || 16,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
  },
  itRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itRowLast: { borderBottomWidth: 0 },
  itEmptyRow: { paddingVertical: 24, alignItems: "center" },
  itEmptyText: { fontSize: 15, color: colors.textMuted, fontStyle: "italic" },
  itCell: { fontSize: 15, color: colors.textPrimary },
  itRight: { textAlign: "right" },
  itCenter: { textAlign: "center" },
  itBold: { fontWeight: "700" },

  emptyDetail: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyDetailText: { fontSize: 16, color: colors.textMuted },
});