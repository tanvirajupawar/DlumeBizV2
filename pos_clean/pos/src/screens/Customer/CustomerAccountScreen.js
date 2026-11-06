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
  Linking,
  Platform,
    AppState,  
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import Header from "../../components/Header";
import { COLORS, SPACING, RADIUS } from "../../components/Colors";
import {
  fetchCustomer,
  fetchCustomerInvoices,
  fetchCustomerLedger,
} from "../../api/customer";


const SUMMARY_PANEL_WIDTH = 380;
const DANGER = "#DC2626";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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

const shiftDateKey = (key, days) => {
  const date = new Date(`${key}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toKey(date);
};

const isOpening = (i) =>
  !!(
    i?.isOpeningBalance ||
    i?.opening_balance === true ||
    i?.openingBalance === true ||
    i?.type === "opening"
  );
const entryDate = (i) =>
  i.date ||
  i.refund_date ||
  i.return_date ||
  i.payment_date ||
  i.invoice_date ||
  i.order_date ||
  i.createdAt ||
  i.created_at ||
  i.createdOn;

  
const totalOf = (i) => {
  if (isOpening(i)) {
    return Number(
      i.balance_amount ?? i.total_amount ?? i.amount ?? 0
    );
  }

  // Backend total_amount is already after discount.
  const total = Number(i.total_amount ?? i.amount ?? 0);

  return Math.max(0, Number.isFinite(total) ? total : 0);
};



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
  if (!d || typeof d !== "object") return "-";

  const product =
    d.product_id && typeof d.product_id === "object"
      ? d.product_id
      : null;

  const base =
    d.product_name ||
    product?.product ||
    d.item_name ||
    d.name ||
    d.product ||
    d.description ||
    "-";

  const type = d.type || product?.type;

  return type ? `${base} (${type})` : base;
};


/**
 * Customer account (ledger) — table style.
 * Renders its own <Header/>: back • customer details • outstanding • date filter.
 */

export default function CustomerAccountScreen({
  customer: initialCustomer,
  company,
  onBack,
  onMenuPress,
  onEditPress,
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
  const [showPdfFilter, setShowPdfFilter] = useState(false);
const [showPdfCalendar, setShowPdfCalendar] = useState(false);

const [pdfPreset, setPdfPreset] = useState("all");
const [pdfFromDate, setPdfFromDate] = useState("");
const [pdfToDate, setPdfToDate] = useState("");
const [pdfDateStep, setPdfDateStep] = useState("from");
const [pdfGenerating, setPdfGenerating] = useState(false);

const pdfGeneratingRef = useRef(false);
const pdfShareStartedRef = useRef(false);

useEffect(() => {
  let leftApp = false;
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "background" || state === "inactive") leftApp = true;
    if (state === "active" && leftApp) {
      leftApp = false;
      // release the lock only after the app has fully resumed from WhatsApp
      setTimeout(() => {
        pdfShareStartedRef.current = false;
        pdfGeneratingRef.current = false;
      }, 1500);
    }
  });
  return () => sub.remove();
}, []);
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

    const [customerRes, invoicesRes, ledgerRes] = await Promise.all([
      fetchCustomer(customerId).catch((err) => {
        console.log("❌ CUSTOMER FETCH ERROR:", err?.response?.data || err?.message);
        return null;
      }),

      fetchCustomerInvoices(customerId).catch((err) => {
        console.log("❌ INVOICE FETCH ERROR:", err?.response?.data || err?.message);
        return null;
      }),

      fetchCustomerLedger(customerId).catch((err) => {
        console.log("❌ CUSTOMER LEDGER FETCH ERROR:", err?.response?.data || err?.message);
        return null;
      }),
    ]);

    if (!active) return;

    // CUSTOMER
    const customerData = customerRes?.data?.data ?? customerRes?.data ?? null;

    if (customerData && typeof customerData === "object") {
      setCustomer((prev) => ({ ...prev, ...customerData }));
    }

    // INVOICES
    const invoices = invoicesRes?.data?.data ?? invoicesRes?.data ?? [];

    // LEDGER RESPONSE
    const ledgerData = ledgerRes?.data?.data ?? ledgerRes?.data ?? {};
    const transactions = Array.isArray(ledgerData.transactions)
      ? ledgerData.transactions
      : [];

    const rawCustomer =
      customerData?.customer ||
      customerData?.data ||
      customerData ||
      {};

    // OPENING BALANCE
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

    const openingEntry =
      openingBalance !== 0
        ? [
            {
              _id: `opening-${customerId}`,
              id: `opening-${customerId}`,
              type: "opening",
              isOpeningBalance: true,
              opening_balance: true,
              openingBalance: true,
              original_opening_balance: openingBalance,
              balance_amount: openingBalance,
              total_amount: openingBalance,
              amount: openingBalance,
              date:
                rawCustomer.opening_balance_date ||
                rawCustomer.openingBalanceDate ||
                rawCustomer.createdAt ||
                rawCustomer.created_at ||
                new Date(),
            },
          ]
        : [];

    // CONVERT BACKEND LEDGER TRANSACTIONS INTO SCREEN ENTRIES
    const ledgerEntries = transactions
      .map((transaction) => {
        if (transaction.type === "SALE") {
          const invoice = invoices.find(
            (item) =>
              String(item._id || item.id) === String(transaction.sale_id)
          );

          return {
            ...invoice,
            ...transaction,
            _id: transaction.sale_id || invoice?._id,
            type: "invoice",
            invoice_no: transaction.reference || invoice?.invoice_no,
            invoice_date: transaction.date,
            total_amount: Number(transaction.amount || 0),
            amount: Number(transaction.amount || 0),
          };
        }

        if (transaction.type === "PAYMENT") {
          return {
            ...transaction,
            _id: transaction.payment_id || transaction._id,
            type: "payment",
            payment_date: transaction.date,
            amount: Number(transaction.amount || 0),
          };
        }

        if (transaction.type === "RETURN") {
          return {
            ...transaction,
            _id: transaction.return_id || transaction._id,
            type: "return",
            return_date: transaction.date,
            return_no: transaction.reference,
            total_amount: Number(transaction.amount || 0),
            amount: Number(transaction.amount || 0),
          };
        }

        if (transaction.type === "REFUND") {
          return {
            ...transaction,
            _id: transaction.refund_id || transaction._id,
            type: "refund",
            refund_date: transaction.date,
            amount: Number(transaction.amount || 0),
          };
        }

        return null;
      })
      .filter(Boolean);

    console.log("🧾 CUSTOMER LEDGER ENTRIES:", ledgerEntries);

    console.log(
  "🔍 FULL INVOICE ITEM DATA:",
  JSON.stringify(
    ledgerEntries
      .filter((e) => e.type === "invoice")
      .map((e) => ({
        invoice_no: e.invoice_no,
        items: e.items,
      })),
    null,
    2
  )
);

    setAccount([...openingEntry, ...ledgerEntries]);

  } catch (err) {
    console.log(
      "❌ CUSTOMER ACCOUNT ERROR:",
      err?.response?.data || err?.message
    );
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
    if (isOpening(a) !== isOpening(b)) {
      return isOpening(a) ? -1 : 1;
    }

    const dateDiff = dayOf(a) - dayOf(b);
    if (dateDiff !== 0) return dateDiff;

    const createdDiff = createdOf(a) - createdOf(b);
    if (createdDiff !== 0) return createdDiff;

    return String(a._id || a.id || "").localeCompare(
      String(b._id || b.id || "")
    );
  });

  let bal = 0;

  return chrono.map((e, idx) => {
    const isCredit = e.type === "payment" || e.type === "return";

    const amt = isOpening(e)
      ? openingAmount(e)
      : isCredit
      ? Number(e.amount ?? e.total_amount ?? 0)
      : totalOf(e);

    bal += isCredit ? -amt : amt;

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
        return toKey(entryDate(i)) >= selectedDate;
      })
      .sort((a, b) => {
        if (isOpening(a) !== isOpening(b)) {
          return isOpening(a) ? 1 : -1;
        }

        // Newest date first
        const dateDiff =
          new Date(entryDate(b) || 0).getTime() -
          new Date(entryDate(a) || 0).getTime();

        if (dateDiff !== 0) return dateDiff;

        // Newest creation time first for same-day transactions
        const createdDiff = createdOf(b) - createdOf(a);

        if (createdDiff !== 0) return createdDiff;

        return String(b._key).localeCompare(String(a._key));
      }),
  [withBalance, selectedDate]
);
const outstanding = useMemo(() => {
  const inv = account
    .filter((i) => i.type !== "payment" && i.type !== "return")
    .reduce(
      (sum, i) =>
        sum + (isOpening(i) ? openingAmount(i) : totalOf(i)),
      0
    );

  const credits = account
    .filter((i) => i.type === "payment" || i.type === "return")
    .reduce(
      (sum, i) => sum + Number(i.amount ?? i.total_amount ?? 0),
      0
    );

  return Math.max(0, inv - credits);
}, [account]);

  // ── Summary rows (respect date filter) ──

const summaryRows = useMemo(
  () =>
    ledger
      .filter((i) => !isOpening(i))
      .map((i) => {
        if (i.type === "payment") {
          return {
            id: i._key,
            kind: "payment",
            date: entryDate(i),
            title: `Payment${i.payment_method ? " • " + i.payment_method : ""}`,
            note: i.remarks || i.note || "",
            amount: Number(i.amount || 0),
          };
        }

        if (i.type === "return") {
          return {
            id: i._key,
            kind: "return",
            date: entryDate(i),
            title: i.return_no || "Customer Return",
            note: i.description || "",
            amount: Number(i.total_amount ?? i.amount ?? 0),
          };
        }

        if (i.type === "refund") {
  return {
    id: i._key,
    kind: "refund",
    date: entryDate(i),
    title: "Refund Paid",
    note: [
      i.refund_method || "",
      i.invoice_no ? `Invoice: ${i.invoice_no}` : "",
    ]
      .filter(Boolean)
      .join(" • "),
    amount: Number(i.amount || 0),
  };
}

        // Invoice: show discounted/payable amount.

const discount = Number(
  i.discount_amount ??
  i.discountAmount ??
  i.discount ??
  0
);

return {
  id: i._key,
  kind: "invoice",
  date: entryDate(i),
  title: i.invoice_no || i.invoiceNo || "Invoice",
  note: discount > 0 ? `Discount: ${money(discount)}` : "",
  amount: totalOf(i),
};

      }),
  [ledger]
);


  const totals = useMemo(
    () =>
      summaryRows.reduce(
        (acc, r) => {
if (r.kind === "invoice" || r.kind === "refund") {
  acc.invoiced += r.amount;
} else {
  acc.received += r.amount;
}
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

const isInactive = customer.is_active === false;   // ← here

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



  // ── Print: balance brought forward + filtered transactions ──


const broughtForward = (() => {
  const openingEntry = withBalance.find(isOpening);

  const originalOpeningBalance = openingEntry
    ? Number(openingEntry._bal || 0)
    : 0;

  if (!selectedDate) return originalOpeningBalance;

  const previousEntries = withBalance
    .filter(
      (item) =>
        !isOpening(item) &&
        toKey(entryDate(item)) < selectedDate
    )
    .sort((a, b) => {
      const diff = dayOf(a) - dayOf(b);
      return diff !== 0 ? diff : createdOf(a) - createdOf(b);
    });

  return previousEntries.length
    ? Number(previousEntries[previousEntries.length - 1]._bal || 0)
    : originalOpeningBalance;
})();



const closingBalance = selectedDate
  ? Math.max(
      0,
      broughtForward + totals.invoiced - totals.received
    )
  : outstanding;



  const transactionRows = [...summaryRows].reverse().map((r) => ({
    date: fmtDate(r.date),
    kind: r.kind,
    title: r.title,
    note: r.note,
    amount: r.amount,
  }));


const openingEntry = withBalance.find(isOpening);

const originalOpeningBalance = Number(
  openingEntry?._bal || 0
);

const printPayload = {
  customer: {
    name,
    company: customer.company_name || "",
    phone: customer.contact_no_1 || "",
  },

  period: selectedDate ? dateLabel : "All Dates",

  // Selected date: balance carried forward to that date.
  // All Dates: original opening balance.
  openingBalance: selectedDate
    ? Number(broughtForward || 0)
    : originalOpeningBalance,

  // Print transactions oldest to newest so the running
  // balance is calculated in the correct order.
rows: transactionRows,

  totalInvoiced: totals.invoiced,
  totalReceived: totals.received,
  outstanding: closingBalance,
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
            (r) => `
<tr>
  <td>${esc(r.date)}</td>
  ${
    r.kind === "balance"
      ? `
        <td colspan="2">
          <b>${esc(r.title)}</b>
          ${r.note ? " – " + esc(r.note) : ""}
        </td>
        <td class="r"><b>${money(r.amount)}</b></td>
      `
      : `
        <td>
          ${esc(r.title)}
          ${r.note ? " – " + esc(r.note) : ""}
        </td>
        <td class="r">
        ${r.kind === "invoice" || r.kind === "refund" ? money(r.amount) : ""}
        </td>
        <td class="r">
          ${
            r.kind === "payment" || r.kind === "return"
              ? money(r.amount)
              : ""
          }
        </td>
      `
  }
</tr>
`
          )
          .join("")}
        <tr class="tot"><td colspan="2">Total</td><td class="r">${money(p.totalInvoiced)}</td><td class="r">${money(p.totalReceived)}</td></tr>
        <tr class="tot">
  <td colspan="3">
    ${selectedDate ? "Closing Balance" : "Outstanding"}
  </td>
  <td class="r due">${money(p.outstanding)}</td>
</tr>
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



const handleViewLedgerPDF = () => {
  console.log("📄 VIEW PDF BUTTON PRESSED");

  pdfShareStartedRef.current = false;
  pdfGeneratingRef.current = false;

  setPdfPreset("all");
  setPdfFromDate("");
  setPdfToDate("");
  setShowPdfFilter(true);
};
const generateLedgerPDF = async () => {
  console.log("🧾 GENERATE PDF BUTTON PRESSED");

  if (pdfGeneratingRef.current || pdfShareStartedRef.current) {
    console.log("⚠️ PDF SHARE ALREADY STARTED - BLOCKING");
    return;
  }

  pdfGeneratingRef.current = true;
  setPdfGenerating(true);


try {
  console.log("🟢 STEP 1: ENTERED PDF TRY BLOCK");
    if (pdfPreset === "custom") {
      if (!pdfFromDate || !pdfToDate) {
        Alert.alert("Select Dates", "Please select both From Date and To Date.");
        return;
      }

      if (pdfFromDate > pdfToDate) {
        Alert.alert("Invalid Dates", "From Date cannot be after To Date.");
        return;
      }
    }
  if (loading) {
  console.log("❌ STEP 2: ACCOUNT STILL LOADING");
  Alert.alert("Please wait", "Customer account is still loading.");
  return;
}

console.log("✅ STEP 2: ACCOUNT LOADED");
console.log("🔍 STEP 3: ACCOUNT COUNT:", account.length);
console.log("🔍 STEP 3A: BALANCE COUNT:", withBalance.length);
console.log("🔍 STEP 3B: PDF PRESET:", pdfPreset);
    if (!withBalance.length) {
      Alert.alert("No Data", "There are no account transactions to view.");
      return;
    }

    // Company details: use populated company data when available.
    // Connect your actual logged-in company object here if needed.


const companyInfo =
  company && typeof company === "object"
    ? company
    : {};

const companyName =
  companyInfo.name ||
  companyInfo.company_name ||
  companyInfo.business_name ||
  "";

const companyGST = companyInfo.gst || companyInfo.gstin || "";
const companyPAN = companyInfo.pan || companyInfo.PAN || "";
const companyEmail = companyInfo.email || "";
const companyMobile =
  companyInfo.mobile || companyInfo.contact_no || "";
const companyAddress = companyInfo.address || "";


const today = toKey(new Date());

let fromKey = null;
let endKey = null;
let periodLabel = "All Dates";
  

switch (pdfPreset) {
  case "one_day":
    fromKey = today;
    endKey = today;
    periodLabel = "Today";
    break;

  case "one_week":
    fromKey = shiftDateKey(today, -6);
    endKey = today;
    periodLabel = "Last 7 Days";
    break;

  case "one_month":
    fromKey = shiftDateKey(today, -29);
    endKey = today;
    periodLabel = "Last 30 Days";
    break;

  case "custom":
    fromKey = pdfFromDate;
    endKey = pdfToDate;
    periodLabel = `${fmtDate(fromKey)} - ${fmtDate(endKey)}`;
    break;

  default:
    break;
}

const allRows = [...withBalance].sort((a, b) => {
  if (isOpening(a) !== isOpening(b)) {
    return isOpening(a) ? -1 : 1;
  }

  const diff = dayOf(a) - dayOf(b);
  return diff !== 0 ? diff : createdOf(a) - createdOf(b);
});

let rows = allRows;

if (fromKey && endKey) {
  const previousRows = allRows.filter(
    (item) =>
      !isOpening(item) &&
      toKey(entryDate(item)) < fromKey
  );

  const openingEntry = allRows.find(isOpening);

  const originalOpeningBalance = openingEntry
    ? Number(openingEntry._bal || 0)
    : 0;

  const broughtForward = previousRows.length
    ? Number(previousRows[previousRows.length - 1]._bal || 0)
    : originalOpeningBalance;

  const filteredRows = allRows.filter((item) => {
    if (isOpening(item)) return false;

    const key = toKey(entryDate(item));

    return key >= fromKey && key <= endKey;
  });

  const openingRow = broughtForward !== 0
    ? [{
        _key: "period-opening",
        type: "opening",
        isOpeningBalance: true,
        balance_amount: broughtForward,
        total_amount: broughtForward,
        amount: broughtForward,
        _amt: broughtForward,
        _bal: broughtForward,
        date: fromKey,
      }]
    : [];

  rows = [...openingRow, ...filteredRows];
}

console.log("✅ STEP 4: PDF ROWS READY:", rows.length);
    let totalDebit = 0;
    let totalCredit = 0;

    const tableRows = rows
      .map((item) => {
        const opening = isOpening(item);
      const isPayment = item.type === "payment";
const isReturn = item.type === "return";
const isRefund = item.type === "refund";
const isCredit = isPayment || isReturn;

        const amount = opening
          ? openingAmount(item)
          : isCredit
          ? Number(item.amount ?? item.total_amount ?? 0)
          : totalOf(item);

        const debit = isCredit ? 0 : amount;
        const credit = isCredit ? amount : 0;

        totalDebit += debit;
        totalCredit += credit;

        const date = opening
          ? fmtDate(item.order_date || item.date)
          : fmtDate(
              item.return_date ||
                item.payment_date ||
                item.invoice_date ||
                entryDate(item)
            );

const refNo = opening
  ? "—"
  : isPayment
  ? item.receipt_no ||
    item.receiptNo ||
    item.payment_no ||
    "—"
  : isReturn
  ? item.return_no || "—"
  : isRefund
  ? item.invoice_no || item.reference || "—"
  : item.invoice_no || item.invoiceNo || "—";

        let particulars = "";
        let description = "";
        let rowClass = "";
        let productRows = "";

        if (opening) {
          particulars = "Opening Balance";
          description = "Previous Outstanding";
          rowClass = "opening";
        } else if (isPayment) {
          particulars = [
            item.payment_method || "Payment",
            item.remarks || item.note,
          ]
            .filter(Boolean)
            .join(" - ");
          description = "—";
          rowClass = "payment";
 } else if (isReturn) {
  particulars = item.return_no || "Customer Return";
  description = item.description || "—";
  rowClass = "return";

} else if (isRefund) {
  particulars = "Refund Paid";

  description = [
    item.refund_method || "",
    item.invoice_no ? `Invoice: ${item.invoice_no}` : "",
    item.description || "",
  ]
    .filter(Boolean)
    .join(" - ") || "—";

  rowClass = "refund";

} else {
          particulars = `Invoice - ${money(amount)}`;
          const details = itemsOf(item);

          if (details.length) {
            productRows = details
              .map((d) => {
                const product = d.product_id &&
                  typeof d.product_id === "object"
                  ? d.product_id
                  : {};

                const productName = itemName(d);
                const desc =
                  d.description ||
                  d.brand ||
                  product.brand ||
                  product.description ||
                  "";

const bagsUnits =
  Number(d.bags) > 0 && Number(d.units_per_bag) > 0
    ? `${d.bags} × ${d.units_per_bag}`
    : "—";
                const qty = d.qty ?? d.quantity ?? "—";
                const size = d.size ?? product.size ?? "—";
                const rate = Number(d.rate ?? d.price ?? 0);
                const itemAmount = Number(
                  d.amount ?? Number(qty === "—" ? 0 : qty) * rate
                );

return `
  <tr class="product">
    <td></td>
    <td></td>
    <td class="product-name">• ${esc(productName)}</td>
    <td class="center">${esc(size)}</td>
    <td class="center">${esc(bagsUnits)}</td>
    <td class="center">${esc(qty)}</td>
    <td class="num">${money(rate)}</td>
    <td class="num">${money(itemAmount)}</td>
    <td class="num"></td>
    <td class="num blue">${money(item._bal)}</td>
  </tr>
`;
              })
              .join("");
          }
        }

        // Invoices with product details show a heading row and detail rows.
        // The invoice amount is displayed in the heading to avoid changing
        // the ledger's actual running-balance calculation.
        const showInvoiceAmount =
          !opening && !isCredit && productRows.length === 0;

   return `
  <tr class="${rowClass}">
<td>${esc(date || "—")}</td>
<td>${esc(refNo)}</td>
<td class="particulars">${esc(particulars)}</td>
<td class="center">—</td>
<td class="center">—</td>
<td class="center">—</td>
<td class="num">—</td>
<td class="num">${debit && showInvoiceAmount ? money(debit) : "—"}</td>
<td class="num">${credit ? money(credit) : "—"}</td>
<td class="num blue">${money(item._bal)}</td>
  </tr>
  ${productRows}
`;
      })
      .join("");

    const finalBalance = Number(
      rows.length ? rows[rows.length - 1]._bal : 0
    );
console.log("✅ STEP 5: TABLE ROWS GENERATED");
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              font-size: 10px;
              margin: 0;
              padding: 0;
            }

            .company-header {
              text-align: center;
              padding: 4px 0 10px;
              border-bottom: 1px solid #d1d5db;
              margin-bottom: 10px;
            }

            .company-name {
              color: #315bea;
              font-size: 23px;
              font-weight: 700;
              margin-bottom: 8px;
              text-transform: uppercase;
            }

            .company-meta {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              line-height: 1.7;
              font-size: 10px;
            }

            .company-meta > div {
              width: 50%;
            }

            .ledger-title {
              text-align: center;
              font-size: 14px;
              font-weight: 700;
              margin: 10px 0 14px;
            }

            .ledger-title span {
              color: #315bea;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 9px;
            }

            th,
            td {
              border: 1px solid #d6d6d6;
              padding: 6px 5px;
              vertical-align: middle;
              overflow-wrap: anywhere;
            }

            th {
              background: #e9e9e9;
              color: #111827;
              font-size: 9px;
              font-weight: 700;
              text-align: left;
              white-space: normal;
            }

th:nth-child(1) { width: 9%; }
th:nth-child(2) { width: 10%; }
th:nth-child(3) { width: 20%; }
th:nth-child(4) { width: 7%; }
th:nth-child(5) { width: 9%; }
th:nth-child(6) { width: 7%; }
th:nth-child(7) { width: 8%; }
th:nth-child(8) { width: 10%; }
th:nth-child(9) { width: 10%; }
th:nth-child(10) { width: 10%; }

            .num {
              text-align: right;
              white-space: nowrap;
            }

            .center {
              text-align: center;
            }

            .opening {
              background: #f1f1f1;
              font-weight: 700;
            }

            .payment {
              background: #e7f7e8;
              color: #087b28;
              font-weight: 700;
            }

            .return {
              background: #fff3e7;
              font-weight: 700;
            }
              .refund {
  background: #FEE2E2;
  color: #DC2626;
  font-weight: 700;
}

            .product {
              background: #ffffff;
            }

            .product:nth-child(even) {
              background: #fafafa;
            }

            .product-name {
              font-weight: 600;
            }

            .blue {
              color: #315bea;
              font-weight: 700;
            }

            .totals {
              width: 300px;
              margin: 16px 0 0 auto;
              border: 1px solid #d6d6d6;
            }

            .total-row {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              padding: 7px 9px;
              background: #ededed;
              border-bottom: 1px solid #d6d6d6;
              font-size: 10px;
            }

            .total-row:last-child {
              border-bottom: 0;
            }

            .total-label {
              flex: 1;
              text-align: right;
              font-weight: 700;
            }

            .total-value {
              min-width: 90px;
              text-align: right;
              font-weight: 700;
            }

            .balance-due {
              background: #dcecff;
              color: #111827;
            }

            tr {
              page-break-inside: avoid;
            }
          </style>
        </head>

        <body>
          <div class="company-header">
            <div class="company-name">${esc(companyName)}</div>

            <div class="company-meta">
              <div>
                ${companyGST ? `GSTIN: ${esc(companyGST)}<br />` : ""}
                ${companyEmail ? `Email: ${esc(companyEmail)}` : ""}
                ${companyAddress ? `<br />${esc(companyAddress)}` : ""}
              </div>

              <div>
                ${companyPAN ? `PAN: ${esc(companyPAN)}<br />` : ""}
                ${companyMobile ? `Mobile: ${esc(companyMobile)}` : ""}
              </div>
            </div>
          </div>

        <div class="ledger-title">
  Sales Ledger of <span>${esc(name)}</span>
</div>

<div style="text-align:center; font-size:11px; margin-bottom:12px; color:#555;">
  Period: ${esc(periodLabel)}
</div>

          <table>
            <thead>
<tr>
  <th>Date</th>
  <th>Ref No.</th>
  <th>Item / Particulars</th>
  <th>Size</th>
  <th>Bags × Units</th>
  <th>Qty</th>
  <th>Rate</th>
  <th>Debit (₹)</th>
  <th>Credit (₹)</th>
  <th>Balance (₹)</th>
</tr>
            </thead>

            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span class="total-label">Total Invoice Amount</span>
              <span class="total-value">${money(totalDebit)}</span>
            </div>

            <div class="total-row">
              <span class="total-label">Total Paid / Received</span>
              <span class="total-value">${money(totalCredit)}</span>
            </div>

            <div class="total-row balance-due">
              <span class="total-label">Balance Due</span>
              <span class="total-value">${money(finalBalance)}</span>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log("✅ STEP 6: HTML GENERATED:", html.length);


// Close the filter modal now, and let it fully finish before using native print
setShowPdfFilter(false);
await wait(600);

console.log("🟢 STEP 7: PRINT TO FILE START");

const file = await Promise.race([
  Print.printToFileAsync({
    html,                 // the real ledger html built above
    base64: false,
    width: 842,           // A4 landscape
    height: 595,
  }),
  new Promise((_, rej) =>
    setTimeout(() => rej(new Error("PDF generation timed out")), 20000)
  ),
]);

console.log("✅ STEP 8: PDF CREATED:", file);

const customerCompanyName =
  customer.company_name ||
  customer.company ||
  customer.company_id?.name ||
  "";

const safeCompanyName = (customerCompanyName || "Company")
  .trim()
  .replace(/[^a-zA-Z0-9_-]/g, "_");

const safeCustomerName = (name || "Customer")
  .trim()
  .replace(/[^a-zA-Z0-9_-]/g, "_");

const date = new Date().toISOString().slice(0, 10);

const fileName = `${safeCompanyName}_${safeCustomerName}_Sales_Reports.pdf`;

const pdfUri = `${FileSystem.cacheDirectory}${fileName}`;

// Copy PDF to a meaningful filename.
await FileSystem.copyAsync({
  from: file.uri,
  to: pdfUri,
});

const canShare = await Sharing.isAvailableAsync();

if (!canShare) {
  Alert.alert(
    "Cannot Open PDF",
    "PDF was created, but sharing is not available on this device."
  );
  return;
}

pdfShareStartedRef.current = true;

console.log("🔒 PDF SHARE LOCK SET");

console.log("🚀 OPENING SHARE SHEET - PDF:", pdfUri);
console.log("📤 CALLING shareAsync", Date.now());
const shareResult = await Sharing.shareAsync(pdfUri, {
  mimeType: "application/pdf",
  dialogTitle: "Customer Ledger PDF",
  UTI: "com.adobe.pdf",
});

console.log("📤 SHARE RESULT:", shareResult);


  } catch (err) {
    console.log("❌ VIEW CUSTOMER LEDGER PDF ERROR:", err);

    Alert.alert(
      "PDF Preview Failed",
      err?.message || "Unable to open the customer ledger PDF."
    );
   } finally {
    // If the share sheet was opened, keep the lock until the app resumes (AppState effect)
    if (!pdfShareStartedRef.current) pdfGeneratingRef.current = false;
    setPdfGenerating(false);
  }

};


  // ── Ledger table ──
  const renderEntry = ({ item, index }) => {
    const opening = isOpening(item);
    const isPay = item.type === "payment";
const isRefund = item.type === "refund";
    const details = !isPay && !opening ? itemsOf(item) : [];
    const expandable = details.length > 0;
    const expanded = expandedKey === item._key;

    let ref = "";
    let sub = "";
    if (opening) {
      ref = "Opening Balance";

} else if (isPay) {
  ref = "Payment Received";
  sub = [item.payment_method, item.remarks || item.note].filter(Boolean).join(" • ");
} else if (item.type === "return") {
  ref = item.return_no || "Customer Return";
  sub = expandable
    ? `${details.length} item${details.length > 1 ? "s" : ""}`
    : item.description || "";

} else if (isRefund) {
  ref = "Refund Paid";

  sub = [
    item.refund_method || "",
    item.invoice_no ? `Invoice: ${item.invoice_no}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

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
style={[
  styles.tdStrong,
  !isPay &&
    !opening && {
    color:
  item.type === "return" || isRefund
    ? DANGER
    : COLORS.primary,
    },
]}                numberOfLines={1}
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

 <Text
  style={[
    styles.td,
    styles.cNum,
    !isPay && styles.invoiceAmount,
  ]}
>
  {!isPay ? money(item._amt) : ""}
</Text>

<Text
  style={[
    styles.td,
    styles.cNum,
    isPay && styles.receivedAmount,
  ]}
>
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
  {Number(d.bags) > 0 && Number(d.units_per_bag) > 0
    ? `${d.bags} × ${d.units_per_bag}`
    : "—"}
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
  <View style={styles.hdrCustomerRow}>
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

    {isInactive && (
      <View style={styles.inactiveBadge}>
        <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
      </View>
    )}

    <Pressable
      onPress={() => onEditPress?.(customer)}
      hitSlop={10}
      style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.6 }]}
    >
      <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.textOnDark} />
    </Pressable>
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

  <View style={styles.toolbarRight}>
    <Text style={styles.toolbarMeta}>
      {loading
        ? ""
        : `${ledger.length} transaction${ledger.length === 1 ? "" : "s"} • ${
            selectedDate ? dateLabel : "All dates"
          }`}
    </Text>

 <Pressable
  style={styles.exportLedgerBtn}
  onPress={handleViewLedgerPDF}
  disabled={loading}
>
  <MaterialCommunityIcons
    name="file-pdf-box"
    size={18}
    color={COLORS.white}
  />
  <Text style={styles.exportLedgerBtnText}>View PDF</Text>
</Pressable>
  </View>
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

<Pressable
  style={styles.panelPrintBtn}
  onPress={handleViewLedgerPDF}
>
  <MaterialCommunityIcons
    name="file-pdf-box"
    size={17}
    color={COLORS.primary}
  />
  <Text style={styles.panelPrintBtnText}>View PDF</Text>
</Pressable>

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
                    {r.kind === "payment" || r.kind === "return" ? "\u2212 " : ""}
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

      {/* PDF FILTER MODAL */}
<Modal
  visible={showPdfFilter}
  transparent
  animationType="fade"
  onRequestClose={() => setShowPdfFilter(false)}
>
  <View style={styles.overlay}>
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={() => setShowPdfFilter(false)}
    />

    <View style={styles.pdfFilterBox}>
      <View style={styles.pdfFilterHeader}>
        <View>
          <Text style={styles.pdfFilterTitle}>Generate Ledger PDF</Text>
          <Text style={styles.pdfFilterSubtitle}>
            Select transaction period
          </Text>
        </View>

        <Pressable onPress={() => setShowPdfFilter(false)}>
          <MaterialCommunityIcons
            name="close"
            size={22}
            color={COLORS.textSecondary}
          />
        </Pressable>
      </View>

      {[
        { label: "One Day", value: "one_day", icon: "calendar-today" },
        { label: "One Week", value: "one_week", icon: "calendar-week" },
        { label: "One Month", value: "one_month", icon: "calendar-month" },
        { label: "All Transactions", value: "all", icon: "calendar-range" },
        { label: "Custom Date", value: "custom", icon: "calendar-edit" },
      ].map((option) => {
        const active = pdfPreset === option.value;

        return (
          <Pressable
            key={option.value}
            onPress={() => {
              setPdfPreset(option.value);

              if (option.value === "custom") {
                setPdfDateStep("from");
                setShowPdfCalendar(true);
              }
            }}
            style={[
              styles.pdfFilterOption,
              active && styles.pdfFilterOptionActive,
            ]}
          >
            <MaterialCommunityIcons
              name={option.icon}
              size={21}
              color={active ? COLORS.primary : COLORS.textSecondary}
            />

            <Text
              style={[
                styles.pdfFilterOptionText,
                active && { color: COLORS.primary },
              ]}
            >
              {option.label}
            </Text>

            <MaterialCommunityIcons
              name={active ? "radiobox-marked" : "radiobox-blank"}
              size={21}
              color={active ? COLORS.primary : COLORS.textMuted}
            />
          </Pressable>
        );
      })}

      {pdfPreset === "custom" && (
        <View style={styles.pdfCustomDates}>
          <Text style={styles.pdfCustomText}>
            From: {pdfFromDate ? fmtDate(pdfFromDate) : "Not selected"}
          </Text>

          <Text style={styles.pdfCustomText}>
            To: {pdfToDate ? fmtDate(pdfToDate) : "Not selected"}
          </Text>
        </View>
      )}

      <View style={styles.pdfFilterActions}>
        <Pressable
          style={styles.pdfCancelBtn}
          onPress={() => setShowPdfFilter(false)}
        >
          <Text style={styles.pdfCancelText}>Cancel</Text>
        </Pressable>

     <Pressable
  style={[
    styles.pdfGenerateBtn,
    pdfGenerating && { opacity: 0.5 },
  ]}
  onPress={() => {
    if (pdfGeneratingRef.current) return;
    console.log("🟢 GENERATE PDF PRESSED");
    generateLedgerPDF();
  }}
  disabled={pdfGenerating}
>
          <MaterialCommunityIcons
            name="file-pdf-box"
            size={19}
            color="#fff"
          />
          <Text style={styles.pdfGenerateText}>Generate PDF</Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

{/* CUSTOM DATE CALENDAR */}
<Modal
  visible={showPdfCalendar}
  transparent
  animationType="fade"
  onRequestClose={() => setShowPdfCalendar(false)}
>
  <View style={styles.overlay}>
    <View style={styles.calendarBox}>
      <Text style={styles.pdfCalendarTitle}>
        Select {pdfDateStep === "from" ? "From Date" : "To Date"}
      </Text>

      <MiniCalendar
        selected={
          pdfDateStep === "from" ? pdfFromDate : pdfToDate
        }
        onSelect={(key) => {
          if (pdfDateStep === "from") {
            setPdfFromDate(key);
            setPdfToDate("");
            setPdfDateStep("to");
          } else {
            if (key < pdfFromDate) {
              Alert.alert(
                "Invalid Date",
                "To Date cannot be before From Date."
              );
              return;
            }

            setPdfToDate(key);
            setShowPdfCalendar(false);
          }
        }}
      />

      <Pressable
        style={{ padding: 12, alignItems: "center" }}
        onPress={() => setShowPdfCalendar(false)}
      >
        <Text style={{ color: COLORS.textMuted, fontWeight: "600" }}>
          Cancel
        </Text>
      </Pressable>
    </View>
  </View>
</Modal>


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
invoiceAmount: {
  fontWeight: "800",
  color: "#000000",
},

receivedAmount: {
  fontWeight: "800",
  color: "#16A34A",
},
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
    hdrCustomerRow: { flexDirection: "row", alignItems: "center", minWidth: 0, flexShrink: 1 },
  inactiveBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(252,165,165,0.2)",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  inactiveBadgeText: { fontSize: 10.5, fontWeight: "800", color: "#FCA5A5", letterSpacing: 0.5 },
  editBtn: {
    marginLeft: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  toolbarRight: {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
},

exportLedgerBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: COLORS.primary,
  paddingHorizontal: 12,
  paddingVertical: 9,
  borderRadius: RADIUS.md,
},

exportLedgerBtnText: {
  color: COLORS.white,
  fontSize: 13,
  fontWeight: "700",
},

// PDF FILTER
pdfFilterBox: {
  width: 390,
  maxWidth: "100%",
  backgroundColor: COLORS.white,
  borderRadius: 16,
  padding: 20,
  elevation: 12,
},

pdfFilterHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
},

pdfFilterTitle: {
  fontSize: 19,
  fontWeight: "800",
  color: COLORS.textPrimary,
},

pdfFilterSubtitle: {
  fontSize: 13,
  color: COLORS.textMuted,
  marginTop: 4,
},

pdfFilterOption: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 13,
  paddingVertical: 14,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: COLORS.divider,
  marginBottom: 9,
  gap: 12,
},

pdfFilterOptionActive: {
  borderColor: COLORS.primary,
  backgroundColor: COLORS.primarySoft || "#EEF2FF",
},

pdfFilterOptionText: {
  flex: 1,
  fontSize: 14.5,
  fontWeight: "600",
  color: COLORS.textPrimary,
},

pdfCustomDates: {
  backgroundColor: "#F8FAFC",
  padding: 12,
  borderRadius: 9,
  marginBottom: 12,
  gap: 8,
},

pdfCustomText: {
  fontSize: 13,
  fontWeight: "600",
  color: COLORS.textSecondary,
},

pdfFilterActions: {
  flexDirection: "row",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 12,
},

pdfCancelBtn: {
  paddingHorizontal: 17,
  paddingVertical: 12,
  borderRadius: 9,
  backgroundColor: "#F1F5F9",
},

pdfCancelText: {
  fontWeight: "700",
  color: COLORS.textSecondary,
},

pdfGenerateBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  paddingHorizontal: 18,
  paddingVertical: 12,
  borderRadius: 9,
  backgroundColor: COLORS.primary,
},

pdfGenerateText: {
  color: "#FFFFFF",
  fontSize: 13.5,
  fontWeight: "800",
},

pdfCalendarTitle: {
  fontSize: 16,
  fontWeight: "800",
  color: COLORS.textPrimary,
  textAlign: "center",
  paddingTop: 15,
},
});