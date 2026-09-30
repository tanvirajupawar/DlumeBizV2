// src/screens/Customer/CustomerAccountScreen.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ScrollView,
  Modal,
  Animated,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import Header from "../../components/Header";
import { COLORS, SPACING, RADIUS } from "../../components/Colors";
import {
  fetchCustomer,
  fetchCustomerInvoices,
  fetchCustomerPayments,
} from "../../api/customer";

const SUMMARY_PANEL_WIDTH = 380;
const DANGER = "#DC2626";

const money = (v) =>
  "\u20B9" +
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const fmtDate = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return isNaN(x) ? "" : x.toLocaleDateString("en-GB");
};

const toKey = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x)) return "";
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate()
  ).padStart(2, "0")}`;
};

const isOpening = (i) =>
  !!(
    i?.isOpeningBalance ||
    i?.opening_balance === true ||
    i?.openingBalance === true ||
    i?.type === "opening"
  );
  const entryDate = (i) =>
  i.invoice_date || i.date || i.order_date || i.payment_date || i.createdOn;
const totalOf = (i) => Number(i.total_amount ?? i.amount ?? 0);
const openingAmount = (i) =>
  Number(i.balance_amount ?? i.total_amount ?? i.amount ?? 0);
const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const dayOf = (x) =>
  new Date(entryDate(x) || x.createdAt || x.createdOn || 0).setHours(0, 0, 0, 0);
const createdOf = (x) =>
  new Date(x.createdAt || x.createdOn || x.created_at || 0).getTime();

const itemsOf = (item) =>
  Array.isArray(item.items) ? item.items : Array.isArray(item.details) ? item.details : [];

const itemName = (d) => {
  const base = d.product_name || d.product_id?.product || d.item_name || "-";
  const type = d.type || d.product_id?.type;
  return type ? `${base} (${type})` : base;
};

/**
 * Customer account (ledger) — table style.
 * Renders its own <Header/>: back • customer details • outstanding • date filter.
 */
export default function CustomerAccountScreen({
  customer: initialCustomer,
  onBack,
  onMenuPress,
  onPrintSummary,
}) {
  const customerId = initialCustomer?._id || initialCustomer?.id;

  const [customer, setCustomer] = useState(initialCustomer || null);
  const [account, setAccount] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null); // yyyy-mm-dd
  const [showCalendar, setShowCalendar] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);

  // ── Side panel animation ──
  const panelAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(panelAnim, {
      toValue: panelOpen ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [panelOpen]);
  const panelTranslateX = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SUMMARY_PANEL_WIDTH, 0],
  });

  // ── Load ──
  useEffect(() => {
    if (!customerId) {
      setLoading(false);
      return;
    }
    let active = true;

    const loadAccount = async () => {
      try {
        setLoading(true);
        const [customerRes, invoicesRes, paymentsRes] = await Promise.all([
          fetchCustomer(customerId).catch((err) => {
            console.log("❌ CUSTOMER FETCH ERROR:", err?.response?.data || err?.message);
            return null;
          }),
          fetchCustomerInvoices(customerId).catch((err) => {
            console.log("❌ INVOICE FETCH ERROR:", err?.response?.data || err?.message);
            return null;
          }),
          fetchCustomerPayments(customerId).catch((err) => {
            console.log("❌ PAYMENT FETCH ERROR:", err?.response?.data || err?.message);
            return null;
          }),
        ]);

        if (!active) return;

        const customerData = customerRes?.data?.data ?? customerRes?.data ?? null;
        if (customerData && typeof customerData === "object") {
          setCustomer((prev) => ({ ...prev, ...customerData }));
        }

      const invoices = invoicesRes?.data?.data ?? invoicesRes?.data ?? [];
const payments = paymentsRes?.data?.data ?? paymentsRes?.data ?? [];

// ─────────────────────────────────────────────
// OPENING BALANCE
// ─────────────────────────────────────────────

const rawCustomer =
  customerData?.customer ||
  customerData?.data ||
  customerData ||
  {};

const openingBalance = Number(
  rawCustomer.opening_balance ??
  rawCustomer.openingBalance ??
  rawCustomer.opening_balance_amount ??
  rawCustomer.openingAmount ??
  rawCustomer.opening ??
  rawCustomer.previous_balance ??
  rawCustomer.previousBalance ??
  0
);

console.log("🔵 CUSTOMER RESPONSE:", customerRes);
console.log("🔵 CUSTOMER DATA:", customerData);
console.log("🔵 OPENING BALANCE FOUND:", openingBalance);

const invoiceEntries = (Array.isArray(invoices) ? invoices : []).map((x) => ({
  ...x,
  type: "invoice",
}));

const paymentEntries = (Array.isArray(payments) ? payments : []).map((x) => ({
  ...x,
  type: "payment",
}));

// Always create the opening row when there is an opening balance
const openingEntry =
  openingBalance !== 0
    ? [
        {
          _id: `opening-${customerId}`,
          id: `opening-${customerId}`,

          type: "opening",
          isOpeningBalance: true,

          // keep all possible flags
          opening_balance: true,
          openingBalance: true,

          // amount
          balance_amount: openingBalance,
          total_amount: openingBalance,
          amount: openingBalance,

          // date
          date:
            rawCustomer.opening_balance_date ||
            rawCustomer.openingBalanceDate ||
            rawCustomer.createdAt ||
            rawCustomer.created_at ||
            new Date(),
        },
      ]
    : [];

console.log("🟢 OPENING ENTRY:", openingEntry);

setAccount([
  ...openingEntry,
  ...invoiceEntries,
  ...paymentEntries,
]);
      } catch (err) {
        console.log("❌ CUSTOMER ACCOUNT ERROR:", err?.response?.data || err?.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    console.log(
  "🔥 OPENED CUSTOMER:",
  initialCustomer?.first_name,
  initialCustomer?._id
);

console.log(
  "🔥 CUSTOMER ID USED:",
  customerId
);

    loadAccount();
    return () => {
      active = false;
    };
  }, [customerId]);

  // ── Running balance (computed oldest → newest on the FULL account,
  //    so balances stay correct when a date filter is applied) ──
  const withBalance = useMemo(() => {
    const chrono = [...account].sort((a, b) => {
      if (isOpening(a) !== isOpening(b)) return isOpening(a) ? -1 : 1;
      const diff = dayOf(a) - dayOf(b);
      return diff !== 0 ? diff : createdOf(a) - createdOf(b);
    });
    let bal = 0;
    return chrono.map((e, idx) => {
      const isPay = e.type === "payment";
      const amt = isOpening(e) ? openingAmount(e) : isPay ? Number(e.amount || 0) : totalOf(e);
      bal += isPay ? -amt : amt;
      return {
        ...e,
        _key: String(e._id || e.id || `${e.type}-${idx}`),
        _amt: amt,
        _bal: bal,
      };
    });
  }, [account]);

  // ── Ledger (date-filtered, newest first) ──
  const ledger = useMemo(
    () =>
      withBalance
        .filter((i) => {
          if (!selectedDate) return true;
          if (isOpening(i)) return true;
          return toKey(entryDate(i)) === selectedDate;
        })
        .sort((a, b) => {
          if (isOpening(a) !== isOpening(b)) return isOpening(a) ? 1 : -1;
          const diff = dayOf(b) - dayOf(a);
          return diff !== 0 ? diff : createdOf(b) - createdOf(a);
        }),
    [withBalance, selectedDate]
  );

 const outstanding = useMemo(() => {
  const inv = account
    .filter((i) => i.type !== "payment")
    .reduce(
      (sum, i) =>
        sum + (isOpening(i) ? openingAmount(i) : totalOf(i)),
      0
    );

  const pay = account
    .filter((i) => i.type === "payment")
    .reduce(
      (sum, i) => sum + Number(i.amount || 0),
      0
    );

  return Math.max(0, inv - pay);
}, [account]);

  // ── Summary rows (respect date filter) ──
  const summaryRows = useMemo(
    () =>
      ledger
        .filter((i) => !isOpening(i))
        .map((i) =>
          i.type === "payment"
            ? {
                id: i._key,
                kind: "payment",
                date: entryDate(i),
                title: `Payment${i.payment_method ? " \u2022 " + i.payment_method : ""}`,
                note: i.remarks || i.note || "",
                amount: Number(i.amount || 0),
              }
            : {
                id: i._key,
                kind: "invoice",
                date: entryDate(i),
                title: i.invoice_no || i.invoiceNo || "Invoice",
                note: "",
                amount: totalOf(i),
              }
        ),
    [ledger]
  );

  const totals = useMemo(
    () =>
      summaryRows.reduce(
        (acc, r) => {
          if (r.kind === "payment") acc.received += r.amount;
          else acc.invoiced += r.amount;
          return acc;
        },
        { invoiced: 0, received: 0 }
      ),
    [summaryRows]
  );

  if (!customer) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.stateText}>Customer not found</Text>
        </View>
      </View>
    );
  }

  const name =
    customer.customer_name ||
    customer.name ||
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
    "Unnamed Customer";

  const place = [
    customer.address_line_1 || customer.address,
    customer.city,
    customer.state,
    customer.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const headerDetails = [
    customer.contact_no_1,
    customer.contact_no_2,
    customer.email,
    place,
    customer.gst ? `GST: ${customer.gst}` : "",
  ]
    .filter(Boolean)
    .join("  \u2022  ");

  const dateLabel = selectedDate
    ? selectedDate.split("-").reverse().join("/")
    : "All Dates";

  // ── Print ──
  const printPayload = {
    customer: {
      name,
      company: customer.company_name || "",
      phone: customer.contact_no_1 || "",
    },
    period: selectedDate ? dateLabel : "All dates",
    rows: [...summaryRows].reverse().map((r) => ({
      date: fmtDate(r.date),
      kind: r.kind,
      title: r.title,
      note: r.note,
      amount: r.amount,
    })),
    totalInvoiced: totals.invoiced,
    totalReceived: totals.received,
    outstanding,
  };

  const buildStatementHtml = (p) => `
    <html><head><meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111; font-size: 13px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      .muted { color: #666; margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border-bottom: 1px solid #ddd; padding: 8px 6px; text-align: left; }
      th { background: #f3f4f6; font-size: 12px; text-transform: uppercase; }
      .r { text-align: right; }
      .tot td { font-weight: 700; border-top: 2px solid #111; }
      .due { color: #dc2626; }
    </style></head><body>
      <h1>Account Statement</h1>
      <div class="muted"><b>${esc(p.customer.name)}</b>${p.customer.company ? " \u2022 " + esc(p.customer.company) : ""}</div>
      ${p.customer.phone ? `<div class="muted">${esc(p.customer.phone)}</div>` : ""}
      <div class="muted">Period: ${esc(p.period)}</div>
      <table>
        <tr><th>Date</th><th>Particulars</th><th class="r">Invoice</th><th class="r">Received</th></tr>
        ${p.rows
          .map(
            (r) => `<tr>
              <td>${esc(r.date)}</td>
              <td>${esc(r.title)}${r.note ? " \u2013 " + esc(r.note) : ""}</td>
              <td class="r">${r.kind === "invoice" ? money(r.amount) : ""}</td>
              <td class="r">${r.kind === "payment" ? money(r.amount) : ""}</td>
            </tr>`
          )
          .join("")}
        <tr class="tot"><td colspan="2">Total</td><td class="r">${money(p.totalInvoiced)}</td><td class="r">${money(p.totalReceived)}</td></tr>
        <tr class="tot"><td colspan="3">Outstanding</td><td class="r due">${money(p.outstanding)}</td></tr>
      </table>
    </body></html>`;

  const handlePrintSummary = () => {
    if (printPayload.rows.length === 0) {
      Alert.alert("Nothing to print", "There are no transactions for this period.");
      return;
    }
    if (onPrintSummary) {
      onPrintSummary(printPayload);
      return;
    }
    Alert.alert("Confirm Print", `Print account summary for ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Print",
        onPress: async () => {
          try {
            await Print.printAsync({ html: buildStatementHtml(printPayload) });
          } catch (err) {
            Alert.alert("Print Failed", err?.message || "Unable to print summary.");
          }
        },
      },
    ]);
  };

  // ── Ledger table ──
  const renderEntry = ({ item, index }) => {
    const opening = isOpening(item);
    const isPay = item.type === "payment";
    const details = !isPay && !opening ? itemsOf(item) : [];
    const expandable = details.length > 0;
    const expanded = expandedKey === item._key;

    let ref = "";
    let sub = "";
    if (opening) {
      ref = "Opening Balance";
    } else if (isPay) {
      ref = "Payment Received";
      sub = [item.payment_method, item.remarks || item.note].filter(Boolean).join(" \u2022 ");
    } else {
      ref = item.invoice_no || item.invoiceNo || "Invoice";
      sub = expandable
        ? `${details.length} item${details.length > 1 ? "s" : ""}`
        : "";
    }

    const date = opening
      ? fmtDate(item.order_date || item.date)
      : fmtDate(entryDate(item));

    return (
      <View style={[styles.rowWrap, index % 2 === 1 && styles.rowAlt]}>
        <Pressable
          disabled={!expandable}
          onPress={() => setExpandedKey(expanded ? null : item._key)}
          style={styles.tr}
        >
          <Text style={[styles.td, styles.cDate]}>{date}</Text>

          <View style={styles.cRef}>
            <View style={styles.refLine}>
              <Text
                style={[styles.tdStrong, !isPay && !opening && { color: COLORS.primary }]}
                numberOfLines={1}
              >
                {ref}
              </Text>
              {expandable && (
                <MaterialCommunityIcons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={COLORS.textMuted}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            {!!sub && (
              <Text style={styles.tdSub} numberOfLines={1}>
                {sub}
              </Text>
            )}
          </View>

          <Text style={[styles.td, styles.cNum]}>
            {!isPay ? money(item._amt) : ""}
          </Text>
          <Text style={[styles.td, styles.cNum]}>
            {isPay ? money(item._amt) : ""}
          </Text>
          <Text
            style={[
              styles.tdStrong,
              styles.cNum,
              item._bal > 0 && { color: DANGER },
            ]}
          >
            {money(item._bal)}
          </Text>
        </Pressable>

        {expanded && (
          <View style={styles.subTable}>
            <View style={styles.subHead}>
              <Text style={[styles.subHeadText, styles.sName]}>Item</Text>
              <Text style={[styles.subHeadText, styles.sBag]}>Bags</Text>
              <Text style={[styles.subHeadText, styles.sQty]}>Qty</Text>
              <Text style={[styles.subHeadText, styles.sPrice]}>Price</Text>
              <Text style={[styles.subHeadText, styles.sTotal]}>Amount</Text>
            </View>
            {details.map((d, i) => (
              <View key={i} style={styles.subRow}>
                <Text style={[styles.subText, styles.sName]} numberOfLines={2}>
                  {itemName(d)}
                </Text>
                <Text style={[styles.subMuted, styles.sBag]}>
                  {d.bags && Number(d.bags) > 0 ? `${d.bags}×${d.units}` : "—"}
                </Text>
                <Text style={[styles.subMuted, styles.sQty]}>{d.qty}</Text>
                <Text style={[styles.subMuted, styles.sPrice]}>
                  {money(d.rate ?? d.price)}
                </Text>
                <Text style={[styles.subText, styles.sTotal]}>{money(d.amount)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const outColorOnDark = outstanding > 0 ? "#FCA5A5" : COLORS.textOnDark;

  return (
    <View style={styles.screen} testID="customer-account-screen">
      {/* ── Header ── */}
      <Header
        title=""
        onBackPress={onBack}
        onMenuPress={onMenuPress}
        hideSearch
        hideScanner
        hideCustomer
        hideMore
        hideHeldCarts
        hideViewHeldCarts
        leftContent={
          <View style={styles.hdrCustomer}>
            <Text style={styles.hdrName} numberOfLines={1}>
              {name}
              {customer.company_name ? (
                <Text style={styles.hdrCompany}>{`  \u2022  ${customer.company_name}`}</Text>
              ) : null}
            </Text>
            {!!headerDetails && (
              <Text style={styles.hdrDetails} numberOfLines={1}>
                {headerDetails}
              </Text>
            )}
          </View>
        }
        // rightExtra={
        //   <Pressable
        //     style={styles.filterBtn}
        //     onPress={() => setPanelOpen((v) => !v)}
        //     hitSlop={8}
        //   >
        //     <MaterialCommunityIcons
        //       name="calendar-text-outline"
        //       size={18}
        //       color={COLORS.white}
        //     />
        //     <Text style={styles.filterBtnText}>{dateLabel}</Text>
        //     <MaterialCommunityIcons
        //       name={panelOpen ? "chevron-up" : "chevron-down"}
        //       size={16}
        //       color={COLORS.white}
        //     />
        //   </Pressable>
        // }
      >
        <View style={styles.hdrOutstanding}>
          <Text style={styles.hdrOutLabel}>OUTSTANDING</Text>
          <Text style={[styles.hdrOutValue, { color: outColorOnDark }]}>
            {money(outstanding)}
          </Text>
        </View>
      </Header>

      {/* ── Toolbar ── */}
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>Statement</Text>
        <Text style={styles.toolbarMeta}>
          {loading
            ? ""
            : `${ledger.length} transaction${ledger.length === 1 ? "" : "s"}  \u2022  ${
                selectedDate ? dateLabel : "All dates"
              }`}
        </Text>
      </View>

      {/* ── Table ── */}
      <View style={styles.body}>
        <View style={styles.thead}>
          <Text style={[styles.th, styles.cDate]}>Date</Text>
          <Text style={[styles.th, styles.cRef]}>Transaction</Text>
          <Text style={[styles.th, styles.cNum]}>Invoiced</Text>
          <Text style={[styles.th, styles.cNum]}>Received</Text>
          <Text style={[styles.th, styles.cNum]}>Balance</Text>
        </View>

        <FlatList
          data={loading ? [] : ledger}
          keyExtractor={(item) => item._key}
          renderItem={renderEntry}
          extraData={expandedKey}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SPACING.xxl }}
          ListEmptyComponent={
            loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.stateText}>Loading account...</Text>
              </View>
            ) : (
              <View style={styles.center}>
                <Ionicons name="document-text-outline" size={44} color={COLORS.textMuted} />
                <Text style={styles.stateText}>No transactions found</Text>
              </View>
            )
          }
        />
      </View>

      {/* ── Summary side panel ── */}
      {panelOpen && (
        <Pressable style={styles.panelBackdrop} onPress={() => setPanelOpen(false)} />
      )}

      <Animated.View
        pointerEvents={panelOpen ? "auto" : "none"}
        style={[
          styles.panel,
          { width: SUMMARY_PANEL_WIDTH, transform: [{ translateX: panelTranslateX }] },
        ]}
      >
        <View style={styles.panelHeaderRow}>
          <Text style={styles.panelTitle}>Account Summary</Text>
          <Pressable onPress={() => setPanelOpen(false)} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.panelDateRow}>
          <View style={styles.panelDateLeft}>
            <MaterialCommunityIcons name="calendar" size={18} color={COLORS.primary} />
            <Text style={styles.panelDateText}>{dateLabel}</Text>
          </View>
          <View style={styles.panelDateBtns}>
            {selectedDate && (
              <Pressable style={styles.panelClearBtn} onPress={() => setSelectedDate(null)}>
                <Text style={styles.panelClearBtnText}>All</Text>
              </Pressable>
            )}
            <Pressable style={styles.panelChangeBtn} onPress={() => setShowCalendar(true)}>
              <Text style={styles.panelChangeBtnText}>Change</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.panelActionRow}>
          <Pressable style={styles.panelPrintBtn} onPress={handlePrintSummary}>
            <MaterialCommunityIcons name="printer-outline" size={17} color={COLORS.primary} />
            <Text style={styles.panelPrintBtnText}>Print</Text>
          </Pressable>
        </View>

        <View style={styles.panelBody}>
          {summaryRows.length === 0 ? (
            <Text style={styles.panelEmpty}>No transactions for this period.</Text>
          ) : (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {summaryRows.map((r) => (
                <View key={r.id} style={styles.panelItemRow}>
                  <Text style={styles.panelItemName} numberOfLines={1}>
                    {r.title}
                  </Text>
                  <View style={styles.panelItemBottom}>
                    <Text style={styles.panelItemMeta} numberOfLines={1}>
                      {fmtDate(r.date)}
                      {r.note ? `  \u2022  ${r.note}` : ""}
                    </Text>
                    <Text style={styles.panelItemAmount}>
                      {r.kind === "payment" ? "\u2212 " : ""}
                      {money(r.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.panelTotals}>
          <View style={styles.panelTotalsRow}>
            <Text style={styles.panelTotalsLabel}>TOTAL INVOICED</Text>
            <Text style={styles.panelTotalsValue}>{money(totals.invoiced)}</Text>
          </View>
          <View style={styles.panelTotalsRow}>
            <Text style={styles.panelTotalsLabel}>TOTAL RECEIVED</Text>
            <Text style={styles.panelTotalsValue}>{money(totals.received)}</Text>
          </View>
          <View style={styles.panelTotalsRow}>
            <Text style={styles.panelTotalsLabel}>OUTSTANDING</Text>
            <Text
              style={[styles.panelTotalsValue, outstanding > 0 && { color: DANGER }]}
            >
              {money(outstanding)}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Date picker */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCalendar(false)} />
          <View style={styles.calendarBox}>
            <MiniCalendar
              selected={selectedDate}
              onSelect={(key) => {
                setSelectedDate(key);
                setShowCalendar(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function MiniCalendar({ selected, onSelect }) {
  const initial = selected ? new Date(selected) : new Date();
  const [month, setMonth] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1)
  );

  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const startOffset = new Date(year, m, 1).getDay();
  const todayKey = toKey(new Date());

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={calStyles.wrap}>
      <View style={calStyles.head}>
        <Pressable onPress={() => setMonth(new Date(year, m - 1, 1))} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={calStyles.title}>
          {MONTHS[m]} {year}
        </Text>
        <Pressable onPress={() => setMonth(new Date(year, m + 1, 1))} hitSlop={10}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.textPrimary} />
        </Pressable>
      </View>

      <View style={calStyles.row}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={calStyles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      {rows.map((row, r) => (
        <View key={r} style={calStyles.row}>
          {row.map((d, c) => {
            if (!d) return <View key={c} style={calStyles.cell} />;
            const key = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const isSel = key === selected;
            const isToday = key === todayKey;
            return (
              <Pressable key={c} style={calStyles.cell} onPress={() => onSelect(key)}>
                <View style={[calStyles.day, isSel && calStyles.daySelected]}>
                  <Text
                    style={[
                      calStyles.dayText,
                      isToday && !isSel && { color: COLORS.primary, fontWeight: "800" },
                      isSel && { color: COLORS.white, fontWeight: "800" },
                    ]}
                  >
                    {d}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <Pressable style={calStyles.todayBtn} onPress={() => onSelect(todayKey)}>
        <Text style={calStyles.todayBtnText}>Today</Text>
      </Pressable>
    </View>
  );
}

const calStyles = StyleSheet.create({
  wrap: { padding: SPACING.md },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 15.5, fontWeight: "700", color: COLORS.textPrimary },
  row: { flexDirection: "row" },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
    paddingVertical: 6,
  },
  cell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  daySelected: { backgroundColor: COLORS.primary },
  dayText: { fontSize: 14, color: COLORS.textPrimary },
  todayBtn: { marginTop: 8, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8 },
  todayBtnText: { fontSize: 13.5, fontWeight: "700", color: COLORS.primary },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.white },

  // ── Header pieces ──
  hdrCustomer: { justifyContent: "center", minWidth: 0 },
  hdrName: { color: COLORS.textOnDark, fontSize: 17, fontWeight: "700" },
  hdrCompany: { fontSize: 13.5, fontWeight: "500", color: COLORS.textOnDarkDim },
  hdrDetails: { color: COLORS.textOnDarkDim, fontSize: 12, marginTop: 2 },
  hdrOutstanding: { alignItems: "flex-start" },
  hdrOutLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: COLORS.textOnDarkDim,
  },
  hdrOutValue: { fontSize: 20, fontWeight: "800", marginTop: 1 },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  filterBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.white },

  // ── Toolbar ──
  toolbar: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  toolbarTitle: { fontSize: 19, fontWeight: "800", color: COLORS.textPrimary },
  toolbarMeta: { fontSize: 13.5, color: COLORS.textMuted },

  // ── Table ──
  body: { flex: 1, backgroundColor: COLORS.white },
  thead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 11,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  th: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cDate: { flex: 1.1 },
  cRef: { flex: 3, paddingRight: 12 },
  cNum: { flex: 1.4, textAlign: "right" },

  rowWrap: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.white,
  },
  rowAlt: { backgroundColor: "#FCFCFD" },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  td: { fontSize: 15, color: COLORS.textSecondary },
  tdStrong: { fontSize: 15.5, fontWeight: "700", color: COLORS.textPrimary },
  tdSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  refLine: { flexDirection: "row", alignItems: "center" },

  // Expanded items
  subTable: {
    marginHorizontal: SPACING.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    backgroundColor: COLORS.white,
  },
  subHead: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  subHeadText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
  },
  subText: { fontSize: 14.5, fontWeight: "600", color: COLORS.textPrimary },
  subMuted: { fontSize: 14.5, color: COLORS.textSecondary },
  sName: { flex: 3, paddingRight: 8 },
  sBag: { flex: 1 },
  sQty: { flex: 1 },
  sPrice: { flex: 1.2, textAlign: "right" },
  sTotal: { flex: 1.3, textAlign: "right" },

  // ── Side panel ──
  panelBackdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 40,
  },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.divider,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    zIndex: 50,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  panelHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  panelTitle: { fontSize: 15.5, fontWeight: "800", color: COLORS.textPrimary },
  panelDateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  panelDateLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  panelDateText: { fontSize: 14.5, fontWeight: "700", color: COLORS.textPrimary },
  panelDateBtns: { flexDirection: "row", alignItems: "center" },
  panelChangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft || "#EEF2FF",
  },
  panelChangeBtnText: { fontSize: 12.5, fontWeight: "700", color: COLORS.primary },
  panelClearBtn: { paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  panelClearBtnText: { fontSize: 12.5, fontWeight: "700", color: COLORS.textSecondary },
  panelActionRow: { flexDirection: "row" },
  panelPrintBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  panelPrintBtnText: { fontSize: 13.5, fontWeight: "700", color: COLORS.primary },
  panelBody: {
    flex: 1,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  panelEmpty: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingVertical: 16,
  },
  panelItemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 3,
  },
  panelItemName: { fontSize: 13.5, fontWeight: "700", color: COLORS.textPrimary },
  panelItemBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelItemMeta: { flex: 1, paddingRight: 8, fontSize: 12.5, color: COLORS.textMuted },
  panelItemAmount: { fontSize: 13.5, fontWeight: "800", color: COLORS.textPrimary },
  panelTotals: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.divider,
    gap: 4,
  },
  panelTotalsRow: { flexDirection: "row", justifyContent: "space-between" },
  panelTotalsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.4,
  },
  panelTotalsValue: { fontSize: 14.5, fontWeight: "800", color: COLORS.textPrimary },

  // ── Calendar modal ──
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  calendarBox: {
    width: 340,
    maxWidth: "100%",
    borderRadius: RADIUS?.lg || 16,
    overflow: "hidden",
    backgroundColor: COLORS.white,
  },

  // ── States ──
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 50 },
  stateText: {
    marginTop: 10,
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
  },
});