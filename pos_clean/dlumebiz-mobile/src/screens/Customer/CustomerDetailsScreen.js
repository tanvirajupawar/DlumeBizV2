import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Easing,
} from "react-native";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import React, { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { viewInvoice, fetchSales } from "../../api/SalesApi";
import MainLayout from "../../layouts/MainLayout";
import { getCompany } from "../../api/AuthApi";

import {
  accontDetails,
  fetchCustomer,
  fetchCustomerLedger,
} from "../../api/CustomerApi";


export default function CustomerDetailsScreen({ route, navigation }) {
const Id = route.params?.customerId ?? route.params;
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedInvoices, setSelectedInvoices] = useState([]);
const [customer, setCustomer] = useState([]);
const [account, setAccount] = useState([]);
const [accountSummary, setAccountSummary] = useState({});
const [company, setCompany] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
const [showReportModal, setShowReportModal] = useState(false);
const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
const [customDateField, setCustomDateField] = useState("from");
const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
const [showCalendar, setShowCalendar] = useState(false);

const chipScale = useRef(new Animated.Value(1)).current;
const calendarAnim = useRef(new Animated.Value(0)).current;
const insets = useSafeAreaInsets();


// const [isEditing, setIsEditing] = useState(false);
const [showDeleteModal, setShowDeleteModal] = useState(false);

// const [editableCustomer, setEditableCustomer] = useState({
//   name: customer.name,
//   phone: customer.phone,
//   city: customer.city,
// });


const normalizeInvoiceDate = (date) => {
  // "06/01/2026" → "2026-01-06"
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}`;
};

const normalizeApiDate = (date) => {
  // works for ISO / timestamp
  return new Date(date).toISOString().split("T")[0];
};

const formatPreviewDate = (date) => {
  if (!date) return "Select date";

  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const filteredAccount = account
  .filter((item) => {
    if (!selectedDate) return true;
    return normalizeApiDate(item.date) === selectedDate;
  })
  .sort((a, b) => {
    // newest first
    return new Date(b.date) - new Date(a.date);
  });





const invoices = [
  {
    id: "1",
    invoiceNo: "INV-00352",
    date: "06/01/2026",
    invoiceAmt: 74400,
    paidAmt: 0,
    outstanding: 74400,
    status: "Unpaid",
    items: [
      { name: "Adidas Ultraboost", bags: 5, unitsPerBag: 8, price: 610, total: 24400 },
      { name: "Adidas Ultraboost", bags: 2, unitsPerBag: 8, price: 610, total: 9760 },
    ],
  },
  {
    id: "2",
    invoiceNo: "INV-00350",
    date: "06/01/2026",
    invoiceAmt: 30528,
    paidAmt: 0,
    outstanding: 30528,
    status: "Unpaid",
    items: [
      { name: "Puma RS-X", bags: 9, unitsPerBag: 2, price: 1696, total: 30528 },
    ],
  },
  {
    id: "3",
    invoiceNo: "INV-00347",
    date: "04/01/2026",
    invoiceAmt: 54810,
    paidAmt: 20000,
    outstanding: 34810,
    status: "Partial",
    items: [
      { name: "Reebok Classic", bags: 3, unitsPerBag: 5, price: 3654, total: 54810 },
    ],
  },
  {
    id: "4",
    invoiceNo: "INV-00341",
    date: "28/12/2025",
    invoiceAmt: 41200,
    paidAmt: 41200,
    outstanding: 0,
    status: "Paid",
    items: [
      { name: "Nike Air Max", bags: 4, unitsPerBag: 5, price: 2060, total: 41200 },
    ],
  },
  {
    id: "5",
    invoiceNo: "INV-00338",
    date: "20/12/2025",
    invoiceAmt: 28950,
    paidAmt: 10000,
    outstanding: 18950,
    status: "Partial",
    items: [
      { name: "Campus Running Shoe", bags: 5, unitsPerBag: 3, price: 1930, total: 28950 },
    ],
  },
  {
    id: "6",
    invoiceNo: "INV-00332",
    date: "12/12/2025",
    invoiceAmt: 17600,
    paidAmt: 0,
    outstanding: 17600,
    status: "Unpaid",
    items: [
      { name: "Sparx Casual", bags: 4, unitsPerBag: 4, price: 1100, total: 17600 },
    ],
  },
  {
    id: "7",
    invoiceNo: "INV-00325",
    date: "30/11/2025",
    invoiceAmt: 65200,
    paidAmt: 65200,
    outstanding: 0,
    status: "Paid",
    items: [
      { name: "Woodland Boots", bags: 8, unitsPerBag: 5, price: 1630, total: 65200 },
    ],
  },
  {
    id: "8",
    invoiceNo: "INV-00319",
    date: "18/11/2025",
    invoiceAmt: 24800,
    paidAmt: 0,
    outstanding: 24800,
    status: "Unpaid",
    items: [
      { name: "Bata Formal", bags: 5, unitsPerBag: 4, price: 1240, total: 24800 },
    ],
  },
];


const payments = [
  {
    id: "pay-1",
    date: "07/01/2026",
    amount: 20000,
    method: "Cash",
    receiver: "Imran",
    remark: "Advance payment",
  },
  {
    id: "pay-2",
    date: "07/12/2026",
    amount: 7000,
    method: "Cash",
    receiver: "Imran",
    remark: "Year end settlement",
  },
  {
    id: "pay-3",
    date: "29/12/2025",
    amount: 41200,
    method: "UPI",
    receiver: "Imran",
    remark: "Full invoice clearance",
  },
  {
    id: "pay-4",
    date: "22/12/2025",
    amount: 10000,
    method: "Cash",
    receiver: "Imran",
    remark: "Partial payment",
  },
  {
    id: "pay-5",
    date: "05/12/2025",
    amount: 15000,
    method: "UPI",
    receiver: "Imran",
    remark: "Running balance adjustment",
  },
  {
    id: "pay-6",
    date: "01/12/2025",
    amount: 30000,
    method: "Cash",
    receiver: "Imran",
    remark: "Bulk settlement",
  },
];



const ledgerData = [
  ...invoices.map((inv) => ({
    type: "invoice",
    dateKey: normalizeInvoiceDate(inv.date),
    ...inv,
  })),
  ...payments.map((pay) => ({
    type: "payment",
    dateKey: normalizeInvoiceDate(pay.date),
    ...pay,
  })),
].sort((a, b) => {
  // 🔥 NEWEST FIRST
  if (a.dateKey > b.dateKey) return -1;
  if (a.dateKey < b.dateKey) return 1;
  return 0;
});

/* ===== FILTERED INVOICES ===== */
const filteredInvoices = invoices.filter((inv) => {
  if (!selectedDate) return true;
  return normalizeInvoiceDate(inv.date) === selectedDate;
});

/* ===== SELECT ALL LOGIC ===== */
const allInvoiceIds = filteredInvoices.map((inv) => inv.id);

const isAllSelected =
  allInvoiceIds.length > 0 &&
  allInvoiceIds.every((id) => selectedInvoices.includes(id));

const toggleSelectAll = () => {
  setSelectedInvoices(isAllSelected ? [] : allInvoiceIds);
};









  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + inv.outstanding,
    0
  );

  const [showPayModal, setShowPayModal] = useState(false);
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);

  const [paymentData, setPaymentData] = useState({
    amount: "",
    date: "",
    remarks: "",
    method: "",
    receiver: "",
    transactionId: "",
  });
useEffect(() => {
  const loadCompany = async () => {
    try {
      const companyData = await getCompany();
      setCompany(companyData);
    } catch (error) {
      console.log("LOAD COMPANY ERROR:", error);
    }
  };

  loadCompany();
}, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchCustomer(Id);

        if (res.data.success) {
          setCustomer(res.data.data);
        }
      } catch (err) {
        Alert.alert(
          "Error",
          err?.response?.data?.message || "Failed to load customer"
        );
      }
    };

const loads = async () => {
  try {
    const [ledgerRes, salesRes] = await Promise.all([
      fetchCustomerLedger(Id),
      fetchSales(),
    ]);

    if (ledgerRes.success) {
      const transactions = ledgerRes.data?.transactions || [];

      // Match each ledger SALE with its full sale record
      const salesMap = new Map(
        (salesRes.sales || []).map((sale) => [
          String(sale.id),
          sale,
        ])
      );

      const updatedTransactions = transactions.map((transaction) => {
        if (transaction.type !== "SALE") {
          return transaction;
        }

        const sale = salesMap.get(String(transaction.sale_id));

        return {
          ...transaction,
          details: sale?.items || [],
          invoice_type: sale?.invoice_type || "",
        };
      });

      setAccount(updatedTransactions);
      setAccountSummary(ledgerRes.data?.summary || {});
    }
  } catch (err) {
    console.log(
      "CUSTOMER DETAILS LOAD ERROR:",
      err.response?.data || err.message
    );

    Alert.alert(
      "Error",
      err?.response?.data?.message ||
        "Failed to load customer transactions"
    );
  }
};

    if (Id) {
      load();
      loads();
    }
  }, [Id]);




  useEffect(() => {

  Animated.spring(chipScale, {
    toValue: selectedDate ? 1.05 : 1,
    friction: 6,
    useNativeDriver: true,
  }).start();
}, [selectedDate]);

useEffect(() => {
  Animated.timing(calendarAnim, {
    toValue: showCalendar ? 1 : 0,
    duration: 260,
    easing: Easing.out(Easing.ease),
    useNativeDriver: true,
  }).start();
}, [showCalendar]);



const generateLocalReport = async (
  reportType,
  duration = "all",
  customFrom = null,
  customTo = null
) => {
  try {
    if (!account.length) {
      Alert.alert("No Data", "There are no customer ledger transactions.");
      return;
    }

    const money = (value) =>
      "₹" +
      Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

    const formatDate = (value) => {
      if (!value) return "—";
      const date = new Date(value);
      return isNaN(date) ? "—" : date.toLocaleDateString("en-GB");
    };

    const toKey = (value) => {
      const date = new Date(value);
      if (isNaN(date)) return "";
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const getDate = (item) =>
      item.date ||
      item.payment_date ||
      item.return_date ||
      item.refund_date ||
      item.invoice_date;

    const getAmount = (item) =>
      Number(item.amount ?? item.total_amount ?? 0);

    const isCredit = (item) =>
      item.type === "PAYMENT" || item.type === "RETURN";

    const customerName =
      customer.company_name ||
      customer.name ||
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
      "Customer";

    const companyName =
      company?.name ||
      company?.company_name ||
      company?.business_name ||
      "";

    const companyGST = company?.gst || company?.gstin || "";
    const companyPAN = company?.pan || company?.PAN || "";
    const companyEmail = company?.email || "";
    const companyMobile = company?.mobile || company?.contact_no || "";
    const companyAddress = company?.address || "";

    // Opening balance
    const openingBalance = Number(
      customer.opening_balance ??
      customer.openingBalance ??
      customer.opening_balance_amount ??
      customer.openingAmount ??
      customer.previous_balance ??
      customer.previousBalance ??
      0
    );

    const openingEntry = openingBalance !== 0
      ? [{
          type: "OPENING",
          isOpeningBalance: true,
          amount: openingBalance,
          date:
            customer.opening_balance_date ||
            customer.openingBalanceDate ||
            customer.createdAt ||
            new Date(),
        }]
      : [];

    // Sort complete ledger oldest to newest
    const allRows = [...openingEntry, ...account].sort((a, b) => {
      if (a.isOpeningBalance) return -1;
      if (b.isOpeningBalance) return 1;
      return new Date(getDate(a) || 0) - new Date(getDate(b) || 0);
    });

    // Calculate running balance before applying date filter
    let balance = 0;

    const rowsWithBalance = allRows.map((item) => {
      const opening = item.isOpeningBalance;
      const credit = isCredit(item);
      const amount = getAmount(item);

      balance += credit ? -amount : amount;

      return {
        ...item,
        _amount: amount,
        _balance: balance,
      };
    });

    // Report period
// Report period
const today = new Date();
let periodStartDate = null;

switch (duration) {
  case "1d":
    periodStartDate = new Date(today);
    periodStartDate.setDate(today.getDate() - 1);
    break;

  case "1w":
    periodStartDate = new Date(today);
    periodStartDate.setDate(today.getDate() - 7);
    break;

  case "1m":
    periodStartDate = new Date(today);
    periodStartDate.setMonth(today.getMonth() - 1);
    break;

  case "3m":
    periodStartDate = new Date(today);
    periodStartDate.setMonth(today.getMonth() - 3);
    break;

  case "6m":
    periodStartDate = new Date(today);
    periodStartDate.setMonth(today.getMonth() - 6);
    break;

  case "custom":
    periodStartDate = new Date(`${customFrom}T00:00:00`);
    break;

  default:
    periodStartDate = null;
}

const fromKey =
  duration === "custom"
    ? customFrom
    : periodStartDate
    ? toKey(periodStartDate)
    : null;

const endKey = duration === "custom" ? customTo : toKey(today);

let rows = rowsWithBalance;

if (fromKey) {
  const previousRows = rowsWithBalance.filter(
    (item) =>
      !item.isOpeningBalance &&
      toKey(getDate(item)) < fromKey
  );

  const originalOpening = rowsWithBalance.find(
    (item) => item.isOpeningBalance
  );

  const broughtForward = previousRows.length
    ? previousRows[previousRows.length - 1]._balance
    : originalOpening?._balance || 0;

  const periodRows = rowsWithBalance.filter((item) => {
    if (item.isOpeningBalance) return false;

    const key = toKey(getDate(item));
    return key >= fromKey && key <= endKey;
  });

  const openingRow =
    broughtForward !== 0
      ? [{
          type: "OPENING",
          isOpeningBalance: true,
          amount: broughtForward,
          _amount: broughtForward,
          _balance: broughtForward,
          date: periodStartDate,
        }]
      : [];

  rows = [...openingRow, ...periodRows];
}

    if (!rows.length) {
      Alert.alert("No Data", "No transactions found for this period.");
      return;
    }

    let totalDebit = 0;
    let totalCredit = 0;

    const tableRows = rows.map((item) => {
      const opening = !!item.isOpeningBalance;
      const payment = item.type === "PAYMENT";
      const returnEntry = item.type === "RETURN";
      const refund = item.type === "REFUND";
      const credit = payment || returnEntry;

      const amount = Number(item._amount || 0);
      const debit = credit ? 0 : amount;
      const received = credit ? amount : 0;

      totalDebit += debit;
      totalCredit += received;

      let rowClass = "";
      let particulars = "";
      let refNo = "—";
      let description = "";
      let productRows = "";

      if (opening) {
        particulars = "Opening Balance";
        description = "Previous Outstanding";
        rowClass = "opening";
      } else if (payment) {
        particulars = [
          item.payment_method || "Payment",
          item.remarks || item.note,
        ].filter(Boolean).join(" - ");
        rowClass = "payment";
     refNo =
  item.receipt_no ||
  item.receiptNo ||
  item.payment_no ||
  item.reference_no ||
  "-";
      } else if (returnEntry) {
        particulars = item.reference || "Customer Return";
        description = item.description || "—";
        rowClass = "return";
        refNo = item.return_no || item.reference || "—";
      } else if (refund) {
        particulars = "Refund Paid";
        description = [
          item.refund_method || "",
          item.invoice_no ? `Invoice: ${item.invoice_no}` : "",
          item.description || "",
        ].filter(Boolean).join(" - ");
        rowClass = "refund";
        refNo = item.invoice_no || item.reference || "—";
      } else {
        particulars = `Invoice - ${money(amount)}`;
        refNo = item.reference || item.invoice_no || "—";

        const details = Array.isArray(item.details) ? item.details : [];

        if (details.length) {
          productRows = details.map((detail) => {
            const product =
              detail.product_id && typeof detail.product_id === "object"
                ? detail.product_id
                : {};

            const productName =
              detail.product_name ||
              product.product ||
              detail.name ||
              detail.product ||
              detail.description ||
              "Item";

            const size = detail.size || product.size || "—";

            const bagsUnits =
              Number(detail.bags) > 0 &&
              Number(detail.units_per_bag || detail.unitsPerBag || detail.units) > 0
                ? `${detail.bags} × ${detail.units_per_bag || detail.unitsPerBag || detail.units}`
                : "—";

            const qty = detail.qty ?? detail.quantity ?? "—";
            const rate = Number(detail.rate ?? detail.price ?? 0);
            const itemAmount = Number(
              detail.amount ??
              (Number(qty === "—" ? 0 : qty) * rate)
            );

            return `
              <tr class="product">
                <td></td>
                <td></td>
                <td class="product-name">• ${escapeHtml(productName)}</td>
                <td class="center">${escapeHtml(size)}</td>
                <td class="center">${escapeHtml(bagsUnits)}</td>
                <td class="center">${escapeHtml(qty)}</td>
                <td class="num">${money(rate)}</td>
                <td class="num">${money(itemAmount)}</td>
                <td class="num">—</td>
                <td class="num blue">${money(item._balance)}</td>
              </tr>
            `;
          }).join("");
        }
      }

      const showInvoiceAmount =
        !opening && !credit && !refund && !productRows;

      return `
        <tr class="${rowClass}">
          <td>${escapeHtml(formatDate(getDate(item)))}</td>
          <td>${escapeHtml(refNo)}</td>
          <td class="particulars">
            ${escapeHtml(particulars)}
            ${description ? `<br/><small>${escapeHtml(description)}</small>` : ""}
          </td>
          <td class="center">—</td>
          <td class="center">—</td>
          <td class="center">—</td>
          <td class="num">—</td>
          <td class="num">${debit && showInvoiceAmount ? money(debit) : "—"}</td>
          <td class="num">${received ? money(received) : "—"}</td>
          <td class="num blue">${money(item._balance)}</td>
        </tr>
        ${productRows}
      `;
    }).join("");

    const finalBalance = Number(
      rows.length ? rows[rows.length - 1]._balance : 0
    );

const periodLabel = fromKey
  ? `${formatDate(periodStartDate)} - ${
      duration === "custom"
        ? formatDate(new Date(`${customTo}T00:00:00`))
        : formatDate(today)
    }`
  : "All Dates";

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
            text-align: left;
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

          .period {
            text-align: center;
            font-size: 11px;
            margin-bottom: 12px;
            color: #555;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 9px;
          }

          th, td {
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
          <div class="company-name">${escapeHtml(companyName)}</div>

          <div class="company-meta">
            <div>
              ${companyGST ? `GSTIN: ${escapeHtml(companyGST)}<br/>` : ""}
              ${companyEmail ? `Email: ${escapeHtml(companyEmail)}<br/>` : ""}
              ${companyAddress ? escapeHtml(companyAddress) : ""}
            </div>
            <div>
              ${companyPAN ? `PAN: ${escapeHtml(companyPAN)}<br/>` : ""}
              ${companyMobile ? `Mobile: ${escapeHtml(companyMobile)}` : ""}
            </div>
          </div>
        </div>

        <div class="ledger-title">
          Sales Ledger of <span>${escapeHtml(customerName)}</span>
        </div>

        <div class="period">
          Period: ${escapeHtml(periodLabel)}
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

const file = await Print.printToFileAsync({
  html,
  base64: false,
  width: 842,
  height: 595,
});

const safeCompanyName = (companyName || "Company")
  .trim()
  .replace(/[^a-zA-Z0-9_-]/g, "_");

const safeCustomerName = (customerName || "Customer")
  .trim()
  .replace(/[^a-zA-Z0-9_-]/g, "_");

const fileName = `${safeCompanyName}_${safeCustomerName}_Sales_Reports.pdf`;
const pdfUri = `${FileSystem.cacheDirectory}${fileName}`;

await FileSystem.copyAsync({
  from: file.uri,
  to: pdfUri,
});

const canShare = await Sharing.isAvailableAsync();

if (!canShare) {
  Alert.alert("PDF Created", "PDF sharing is unavailable on this device.");
  return;
}

await Sharing.shareAsync(pdfUri, {
  mimeType: "application/pdf",
  dialogTitle: "Customer Payment Receipts",
  UTI: "com.adobe.pdf",
});
  

  } catch (error) {
    console.log("CUSTOMER LEDGER PDF ERROR:", error);
    Alert.alert(
      "PDF Failed",
      error?.message || "Unable to generate customer ledger PDF."
    );
  }
};




const generateReceiptReport = async () => {
  try {
    const receipts = account
      .filter((item) => item.type === "PAYMENT")
    .sort(
  (a, b) =>
    new Date(a.date || a.payment_date || 0) -
    new Date(b.date || b.payment_date || 0)
);

    if (!receipts.length) {
      Alert.alert("No Receipts", "There are no payment receipts for this customer.");
      return;
    }

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const money = (value) =>
      "₹" + Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

    const formatDate = (value) => {
      if (!value) return "-";
      const date = new Date(value);
      return isNaN(date.getTime())
        ? "-"
        : date.toLocaleDateString("en-GB");
    };

    const customerName =
      customer.company_name ||
      customer.name ||
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
      "Customer";

    const companyName =
      company?.name ||
      company?.company_name ||
      company?.business_name ||
      "";

    const companyAddress = company?.address || "";
    const companyMobile = company?.mobile || company?.contact_no || "";
    const companyGST = company?.gst || company?.gstin || "";

    let totalReceived = 0;

    const rows = receipts.map((item, index) => {
      const amount = Number(item.amount ?? item.total_amount ?? 0);
      totalReceived += amount;

      const receiptNo =
        item.receipt_no ||
        item.receiptNo ||
        item.payment_no ||
        item.reference_no ||
        "-";

      const paymentMode = item.payment_method || "-";
      const remarks = item.remarks || item.note || "-";

      return `
        <tr>
        <td class="center">${index + 1}</td>

          <td>${escapeHtml(formatDate(item.date || item.payment_date))}</td>
          <td>${escapeHtml(receiptNo)}</td>
          <td>${escapeHtml(paymentMode)}</td>
          <td>${escapeHtml(remarks)}</td>
          <td class="num receipt">${money(amount)}</td>
        </tr>
      `;
    }).join("");

 
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
        text-align: left;
      }

      .company-meta > div {
        width: 50%;
      }

      .ledger-title {
        text-align: center;
        font-size: 14px;
        font-weight: 700;
        margin: 10px 0 6px;
      }

      .ledger-title span {
        color: #315bea;
      }

      .period {
        text-align: center;
        font-size: 11px;
        margin-bottom: 12px;
        color: #555;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 9px;
      }

      th, td {
        border: 1px solid #d6d6d6;
        padding: 7px 8px;
        vertical-align: middle;
        overflow-wrap: anywhere;
      }

      th {
        background: #e9e9e9;
        color: #111827;
        font-size: 9px;
        font-weight: 700;
        text-align: left;
      }

      th:nth-child(1) { width: 8%; }
      th:nth-child(2) { width: 12%; }
      th:nth-child(3) { width: 17%; }
      th:nth-child(4) { width: 15%; }
      th:nth-child(5) { width: 33%; }
      th:nth-child(6) { width: 15%; }

      .center {
        text-align: center;
      }

      .num {
        text-align: right;
        white-space: nowrap;
      }

      .receipt {
        background: #e7f7e8;
        color: #087b28;
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
      <div class="company-name">${escapeHtml(companyName)}</div>

      <div class="company-meta">
        <div>
          ${companyGST ? `GSTIN: ${escapeHtml(companyGST)}<br/>` : ""}
          ${companyAddress ? escapeHtml(companyAddress) : ""}
        </div>

        <div>
          ${companyMobile ? `Mobile: ${escapeHtml(companyMobile)}` : ""}
        </div>
      </div>
    </div>

    <div class="ledger-title">
      Payment Receipts of <span>${escapeHtml(customerName)}</span>
    </div>

    <div class="period">
      Total Receipts: ${receipts.length}
    </div>

    <table>
      <thead>
        <tr>
          <th>Sr. No.</th>
          <th>Date</th>
          <th>Receipt No.</th>
          <th>Payment Mode</th>
          <th>Remarks</th>
          <th>Amount (₹)</th>
        </tr>
      </thead>

      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row balance-due">
        <span class="total-label">Total Received</span>
        <span class="total-value">${money(totalReceived)}</span>
      </div>
    </div>
  </body>
  </html>
`;

const file = await Print.printToFileAsync({
  html,
  base64: false,
  width: 842,
  height: 595,
});

const safeCompanyName = (companyName || "Company")
  .trim()
  .replace(/[^a-zA-Z0-9_-]/g, "_");

const safeCustomerName = (customerName || "Customer")
  .trim()
  .replace(/[^a-zA-Z0-9_-]/g, "_");

const fileName = `${safeCompanyName}_${safeCustomerName}_Payment_Receipts.pdf`;
const pdfUri = `${FileSystem.cacheDirectory}${fileName}`;

await FileSystem.copyAsync({
  from: file.uri,
  to: pdfUri,
});

const canShare = await Sharing.isAvailableAsync();

if (!canShare) {
  Alert.alert("PDF Created", "PDF sharing is unavailable on this device.");
  return;
}

await Sharing.shareAsync(pdfUri, {
  mimeType: "application/pdf",
  dialogTitle: "Customer Payment Receipts",
  UTI: "com.adobe.pdf",
});

  } catch (error) {
    console.log("RECEIPT REPORT ERROR:", error);
    Alert.alert(
      "PDF Failed",
      error?.message || "Unable to generate payment receipts PDF."
    );
  }
};



  const getStatusStyle = (status) => {
    switch (status) {
      case "Paid":
        return { bg: "#DCFCE7", text: "#166534" };
      case "Partial":
        return { bg: "#FEF3C7", text: "#92400E" };
      default:
        return { bg: "#FEE2E2", text: "#991B1B" };
    }
  };

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoices((prev) =>
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };
const renderItemRow = (item, index) => {
  const bags = Number(item.bags || 0);
  const qty = Number(item.qty || 0);

  // Calculate units per bag if the API doesn't provide it
  const unitsPerBag =
    Number(
      item.units ??
      item.units_per_bag ??
      item.unitsPerBag ??
      0
    ) || (bags > 0 ? qty / bags : 0);

  return (
    <View key={index} style={styles.itemRow}>
      <Text style={styles.itemName} numberOfLines={1}>
        {item.product_id?.product || item.product_name || "Item"}
      </Text>

      <Text style={styles.itemQty}>
        {bags > 0 ? `${bags}×${unitsPerBag}` : "-"}
      </Text>

      <Text style={styles.itemQty}>
        {qty}
      </Text>

   <Text style={styles.itemPrice}>
  ₹{Number(
    item.rate ??
    item.price ??
    item.purchase_price ??
    0
  ).toLocaleString("en-IN")}
</Text>

      <Text style={styles.itemTotal}>
        ₹{Number(item.amount || 0).toLocaleString("en-IN")}
      </Text>
    </View>
  );
};

 const renderInvoiceRow = ({ item }) => {
   // ================= PAYMENT ROW =================
if (item.type === "PAYMENT") {
  return (
    <View style={styles.paymentRow}>
      <View style={styles.paymentLeft}>
        <View>
          {/* DATE – PRIMARY */}
          <Text style={styles.paymentDate}> {new Date(item.date).toLocaleDateString("en-GB")}</Text>

          {/* MODE + REMARK – SINGLE LINE */}
          {(item.payment_method || item.remarks) && (
            <Text style={styles.paymentMeta} numberOfLines={1}>
              {item.payment_method && item.remarks
                ? `${item.payment_method} • ${item.remarks}`
                : item.payment_method || item.remarks}
            </Text>
          )}
        </View>
      </View>

      {/* AMOUNT */}
      <Text style={styles.paymentAmount}>
        − ₹{item.amount}
      </Text>
    </View>
  );
}


// ================= RETURN ROW =================
if (item.type === "RETURN") {
  return (
    <View style={styles.returnRow}>
      <View style={styles.paymentLeft}>
        <Text style={styles.returnDate}>
          {new Date(item.date).toLocaleDateString("en-GB")}
        </Text>

        <Text style={styles.returnMeta} numberOfLines={1}>
          RETURN
          {item.reference ? ` • ${item.reference}` : ""}
          {item.description ? ` • ${item.description}` : ""}
        </Text>
      </View>

      <Text style={styles.returnAmount}>
        − ₹{Number(item.amount || 0).toLocaleString("en-IN")}
      </Text>
    </View>
  );
}
 
 
   // ================= INVOICE ROW (EXISTING) =================
const statusStyle = getStatusStyle(
  item.status === "PAID"
    ? "Paid"
    : item.status === "PARTIAL"
    ? "Partial"
    : "Unpaid"
); 
   return (
     <View style={styles.invoiceContainer}>
       {/* HEADER */}
       <View style={styles.invoiceHeader}>
         <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
           {/* <TouchableOpacity
             onPress={() => toggleInvoiceSelection(item.id)}
             style={[
               styles.checkbox,
               selectedInvoices.includes(item.id) &&
                 styles.checkboxChecked,
             ]}
           >
             {selectedInvoices.includes(item.id) && (
               <Ionicons name="checkmark" size={14} color="#FFFFFF" />
             )}
           </TouchableOpacity> */}
 
           <View>
            
             <Text style={styles.invoiceDate}> {new Date(item.date).toLocaleDateString("en-GB")}</Text>
            <Text style={styles.invoiceNo}>{item.reference}</Text>
           </View>
         </View>
 
         {/* RIGHT ACTIONS */}
         <View style={styles.invoiceHeaderRight}>
           {/* <View
             style={[
               styles.statusBadge,
               { backgroundColor: statusStyle.bg },
             ]}
           >
             <Text
               style={[
                 styles.statusText,
                 { color: statusStyle.text },
               ]}
             >
               {item.status}
             </Text>
           </View> */}
 
           <TouchableOpacity
             style={styles.downloadIconBtn}
onPress={() =>
viewInvoice(
  item.sale_id,
  item.invoice_type,
  item.reference,
  customer.first_name ||
    customer.company_name ||
    "Customer"
)
}
           >
             <Ionicons
               name="download-outline"
               size={16}
               color="#2563EB"
             />
           </TouchableOpacity>
 
           {/* <TouchableOpacity
             style={styles.deleteIconBtn}
             onPress={() => {
               setInvoiceToDelete(item.id);
               setShowDeleteModal(true);
             }}
           >
             <Ionicons
               name="trash-outline"
               size={16}
               color="#DC2626"
             />
           </TouchableOpacity> */}
         </View>
       </View>
 
       {/* ITEMS */}
       <View style={styles.itemsContainer}>
         <View style={styles.itemHeader}>
           <Text style={styles.itemHeaderText}>Item</Text>
           <Text style={styles.itemHeaderQty}>Bags</Text>
           <Text style={styles.itemHeaderQty}>Qty</Text>
           <Text style={styles.itemHeaderPrice}>Price</Text>
           <Text style={styles.itemHeaderTotal}>Total</Text>
         </View>
 
       {(item.details || []).map(renderItemRow)}
 
         {/* AMOUNTS */}
         <View style={styles.amountRow}>
           <View style={styles.amountSummary}>
             <View style={styles.amountBox}>
               <Text style={styles.amountLabel}>Total</Text>
              <Text style={styles.amountValue}>
  ₹{Number(item.amount || 0).toLocaleString("en-IN")}
</Text>
             </View>
 
             {/* <View style={styles.amountBox}>
               <Text style={styles.amountLabel}>Paid</Text>
               <Text
                 style={[
                   styles.amountValue,
                   styles.paidAmount,
                 ]}
               >
                 ₹{item.paidAmt}
               </Text>
             </View>
  */}
             {/* <View style={styles.amountBox}>
               <Text style={styles.amountLabel}>Due</Text>
               <Text
                 style={[
                   styles.amountValue,
                   styles.outstandingAmount,
                 ]}
               >
                 ₹{item.outstanding}
               </Text>
             </View> */}
           </View>
         </View>
       </View>
     </View>
   );
 };

return (
  
  <MainLayout navigation={navigation} currentRoute="Customers">
    <SafeAreaView style={styles.container}>

{/* ================= CUSTOMER SUMMARY ================= */}
<View style={styles.customerSection}>

  {/* ===== TOP HEADER ===== */}
<View style={styles.topHeader}>

  {/* LEFT : CUSTOMER INFO (READ ONLY) */}
  <View style={{ flex: 1 }}>

    {/* Name / Company */}
 <Text style={styles.storeName}>
  {customer.company_name || ""}
</Text>

<Text style={styles.customerName}>
  {customer.name ||
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim()}
</Text>

    {/* Contact */}
    {!!customer.contact_no_1 && (
      <Text style={styles.customerDetail}>
        📞 {customer.contact_no_1}
      </Text>
    )}

    {!!customer.contact_no_2 && (
      <Text style={styles.customerDetail}>
        📞 {customer.contact_no_2}
      </Text>
    )}

    {/* Email */}
    {!!customer.email && (
      <Text style={styles.customerDetail}>
        ✉️ {customer.email}
      </Text>
    )}

    {/* Address */}
    {!!customer.address && (
      <Text style={styles.customerDetail}>
        📍 {customer.address}
      </Text>
    )}

    {/* City / State / Pincode */}
    {(customer.city || customer.state || customer.pincode) && (
      <Text style={styles.customerDetail}>
        {[
          customer.city,
          customer.state,
          customer.pincode,
        ]
          .filter(Boolean)
          .join(", ")}
      </Text>
    )}

    {/* GST */}
    {!!customer.gst && (
      <Text style={styles.customerDetail}>
        GST: {customer.gst}
      </Text>
    )}

  </View>

  {/* RIGHT : OUTSTANDING */}
  <View style={styles.headerRight}>
    <View style={styles.outstandingCard}>
      <Text style={styles.outstandingLabel}>Outstanding</Text>
      <Text style={styles.outstandingValue}>
      ₹{Number(accountSummary.outstanding || 0).toLocaleString("en-IN")}
      </Text>
    </View>
  </View>

</View>


  {/* ===== ACTION ROW ===== */}
  <View style={styles.actionRow}>

    {/* DATE FILTER */}
    <Animated.View
      style={[
        styles.dateChip,
        selectedDate && styles.dateChipActive,
        { transform: [{ scale: chipScale }] },
      ]}
    >
      <TouchableOpacity
        style={styles.chipContent}
        onPress={() => setShowCalendar(true)}
      >
        <Text
          style={[
            styles.dateChipText,
            selectedDate && styles.dateChipTextActive,
          ]}
        >
          {selectedDate
            ? selectedDate.split("-").reverse().join("/")
            : "📅 Date"}
        </Text>

        {selectedDate && (
          <TouchableOpacity
            onPress={() => setSelectedDate(null)}
            style={styles.clearIcon}
          >
            <Text style={styles.clearIconText}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>


   {/* PAY */}
    {/* <TouchableOpacity
      style={[
        styles.smallBtn,
        selectedInvoices.length === 0 && styles.smallBtnDisabled,
      ]}
      disabled={selectedInvoices.length === 0}
      onPress={() => {
        setPaymentData({
          amount: totalOutstanding.toString(),
          date: "",
          remarks: "",
          method: "",
          receiver: "",
          transactionId: "",
        });
        setShowPayModal(true);
      }}
    >
      <Ionicons name="card-outline" size={14} color="#FFFFFF" />
      <Text style={styles.smallBtnText}>Pay</Text>
    </TouchableOpacity>

    DELETE
    <TouchableOpacity
      style={styles.deleteBtnSmall}
      onPress={() => setShowDeleteModal(true)}
    >
      <Ionicons name="trash-outline" size={14} color="#DC2626" />
      <Text style={styles.deleteBtnSmallText}>Delete</Text>
    </TouchableOpacity> */}

  </View>

 
</View>
 {/* ===== SELECT ALL + PAY ===== */}
  {/* <View style={styles.headerActionsRow}>

    <TouchableOpacity
      style={styles.selectAllInline}
      onPress={toggleSelectAll}
    >
      <View
        style={[
          styles.checkbox,
          isAllSelected && styles.checkboxChecked,
        ]}
      >
        {isAllSelected && (
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        )}
      </View>
      <Text style={styles.selectAllInlineText}>Select All</Text>
    </TouchableOpacity>
 

  </View> */}




      {/* ================= CALENDAR OVERLAY (MUST BE OUTSIDE) ================= */}
      {showCalendar && (
        <View style={styles.calendarOverlay}>
          {/* BACKDROP */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowCalendar(false)}
          />

          {/* CALENDAR */}
          <Animated.View
            style={[
              styles.calendarWrapper,
              {
                opacity: calendarAnim,
                transform: [
                  {
                    translateY: calendarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Calendar
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{
                ...(selectedDate && {
                  [selectedDate]: {
                    selected: true,
                    selectedColor: "#2563EB",
                  },
                }),
              }}
              theme={{
                todayTextColor: "#2563EB",
                arrowColor: "#2563EB",
              }}
              style={styles.calendar}
            />
          </Animated.View>
        </View>
      )}




      {/* ================= INVOICE LIST ================= */}
<FlatList
  data={filteredAccount}
  renderItem={renderInvoiceRow}
keyExtractor={(item) =>
  String(
    item.sale_id ||
    item.payment_id ||
    item.return_id ||
    item.refund_id ||
    item.reference
  )
}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{
    paddingHorizontal: 12,
    paddingTop: 8,
  }}
  ListFooterComponent={<View style={{ height: 120 }} />}
/>


      {/* ================= COMING SOON SECTION ================= */}
      {/* <View style={styles.comingSoonContainer}>
        <View style={styles.comingSoonCard}>
          <Ionicons name="time-outline" size={48} color="#9CA3AF" />
          <Text style={styles.comingSoonTitle}>Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            Invoice details and transaction history will be available here
          </Text>
        </View>
      </View> */}


      {/* ================= STICKY BOTTOM ACTION BAR ================= */}
<SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
 
    
   

    {/* ================= STICKY BOTTOM ACTION BAR ================= */}
   <View
  style={[
    styles.bottomBar,
    { bottom: insets.bottom  }
  ]}
>
      <TouchableOpacity
        style={[styles.bottomBtn, styles.bottomSecondary]}
onPress={() => setShowReportModal(true)}
      >
        <Ionicons name="bar-chart-outline" size={18} color="#2563EB" />
        <Text style={styles.bottomBtnText}>Reports</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.bottomBtn, styles.bottomSecondary]}
onPress={generateReceiptReport}   >
        <Ionicons name="receipt-outline" size={18} color="#2563EB" />
        <Text style={styles.bottomBtnText}>Receipts</Text>
      </TouchableOpacity>
    </View>

</SafeAreaView>

{showDeleteModal && (
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>
      <Text style={styles.modalTitle}>Delete Customer?</Text>
      <Text style={styles.modalText}>
        This action cannot be undone.
      </Text>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={styles.modalCancel}
          onPress={() => setShowDeleteModal(false)}
        >
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modalDelete}
          onPress={() => {
            setShowDeleteModal(false);
            navigation.goBack(); // later replace with delete API
          }}
        >
          <Text style={styles.modalDeleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}
{showPayModal && (
  <View style={styles.modalOverlay}>
    <View style={styles.paymentModal}>

      <Text style={styles.modalTitle}>Enter Payment Details</Text>

      <TextInput
        placeholder="Payment Amount"
        value={paymentData.amount}
        onChangeText={(t) =>
          setPaymentData({ ...paymentData, amount: t })
        }
        keyboardType="numeric"
        style={styles.modalInput}
      />

      <TextInput
        placeholder="Payment Date"
        value={paymentData.date}
        onChangeText={(t) =>
          setPaymentData({ ...paymentData, date: t })
        }
        style={styles.modalInput}
      />

      <TextInput
        placeholder="Remarks"
        value={paymentData.remarks}
        onChangeText={(t) =>
          setPaymentData({ ...paymentData, remarks: t })
        }
        style={styles.modalInput}
      />

      {/* PAYMENT METHOD */}
      <TouchableOpacity
        style={[
          styles.dropdownField,
          showMethodDropdown && styles.dropdownFieldActive,
        ]}
        onPress={() => setShowMethodDropdown(!showMethodDropdown)}
      >
        <Text
          style={[
            styles.dropdownValue,
            !paymentData.method && styles.dropdownPlaceholder,
          ]}
        >
          {paymentData.method || "Payment Method"}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color="#6B7280"
        />
      </TouchableOpacity>

      {showMethodDropdown && (
        <View style={styles.dropdownMenu}>
          {["Cash", "UPI"].map((m) => (
            <TouchableOpacity
              key={m}
              style={styles.dropdownItem}
              onPress={() => {
                setPaymentData({ ...paymentData, method: m });
                setShowMethodDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* RECEIVER NAME (Cash + UPI) */}
      {paymentData.method !== "" && (
        <TextInput
          placeholder="Receiver Name"
          value={paymentData.receiver}
          onChangeText={(t) =>
            setPaymentData({ ...paymentData, receiver: t })
          }
          style={styles.modalInput}
        />
      )}

      {/* TRANSACTION ID (UPI ONLY) */}
      {paymentData.method === "UPI" && (
        <TextInput
          placeholder="Transaction ID / UTR"
          value={paymentData.transactionId}
          onChangeText={(t) =>
            setPaymentData({ ...paymentData, transactionId: t })
          }
          style={styles.modalInput}
        />
      )}

      {/* ACTIONS */}
      <View style={styles.modalActionsRow}>
        <TouchableOpacity onPress={() => setShowPayModal(false)}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={() => {
            setShowPayModal(false);
          }}
        >
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>
      </View>

    </View>
  </View>
)}

{showReportModal && (
  <View style={styles.modalOverlay}>
    <View style={styles.reportModal}>
      <Text style={styles.reportTitle}>Select Report Duration</Text>

      {[
        { label: "1 Day", value: "1d" },
        { label: "1 Week", value: "1w" },
        { label: "1 Month", value: "1m" },
        { label: "3 Months", value: "3m" },
        { label: "6 Months", value: "6m" },
        { label: "All", value: "all" },
      ].map((item) => (
        <TouchableOpacity
          key={item.value}
          style={styles.reportOption}
          onPress={() => {
            setShowReportModal(false);
            setShowCustomDatePicker(false);
            generateLocalReport("SALE", item.value);
          }}
        >
          <Text style={styles.reportOptionText}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      ))}

      {/* CUSTOM DATE OPTION */}
      <TouchableOpacity
        style={styles.reportOption}
     onPress={() => {
  setFromDate("");
  setToDate("");
  setCustomDateField("from");
  setShowCustomDatePicker(true);
  setShowCustomCalendar(true);
}}
      >
        <Text style={styles.reportOptionText}>Custom Date</Text>
        <Ionicons name="calendar-outline" size={18} color="#2563EB" />
      </TouchableOpacity>

      {showCustomDatePicker && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "700", marginBottom: 10 }}>
            Choose Custom Period
          </Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                backgroundColor:
                  customDateField === "from" ? "#DBEAFE" : "#F1F5F9",
                borderWidth: 1,
                borderColor:
                  customDateField === "from" ? "#2563EB" : "#E5E7EB",
              }}
            onPress={() => {
  setCustomDateField("from");
  setShowCustomCalendar(true);
}}
            >
              <Text style={{ fontSize: 11, color: "#64748B" }}>FROM DATE</Text>
              <Text style={{ fontWeight: "700", color: "#1E293B" }}>
              {formatPreviewDate(fromDate)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                backgroundColor:
                  customDateField === "to" ? "#DBEAFE" : "#F1F5F9",
                borderWidth: 1,
                borderColor:
                  customDateField === "to" ? "#2563EB" : "#E5E7EB",
              }}
           onPress={() => {
  setCustomDateField("to");
  setShowCustomCalendar(true);
}}
            >
              <Text style={{ fontSize: 11, color: "#64748B" }}>TO DATE</Text>
              <Text style={{ fontWeight: "700", color: "#1E293B" }}>
            {formatPreviewDate(toDate)}
              </Text>
            </TouchableOpacity>
          </View>

      

          <TouchableOpacity
            style={[
              styles.reportOption,
              {
                backgroundColor: "#2563EB",
                justifyContent: "center",
                marginTop: 8,
              },
            ]}
            disabled={!fromDate || !toDate || fromDate > toDate}
            onPress={() => {
              setShowReportModal(false);
              setShowCustomDatePicker(false);
              generateLocalReport("SALE", "custom", fromDate, toDate);
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
              Generate Custom Report
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.reportCancel}
        onPress={() => {
          setShowReportModal(false);
          setShowCustomDatePicker(false);
        }}
      >
        <Text style={styles.reportCancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
)}

{showCustomCalendar && (
  <View style={styles.customCalendarOverlay}>
    <TouchableOpacity
      style={styles.customCalendarBackdrop}
      activeOpacity={1}
      onPress={() => setShowCustomCalendar(false)}
    />

    <View style={styles.customCalendarCard}>
      <View style={styles.customCalendarHeader}>
        <Text style={styles.reportTitle}>
          {customDateField === "from" ? "Select From Date" : "Select To Date"}
        </Text>

        <TouchableOpacity
          onPress={() => setShowCustomCalendar(false)}
        >
          <Ionicons name="close" size={22} color="#64748B" />
        </TouchableOpacity>
      </View>

      <Calendar
        current={
          customDateField === "from"
            ? fromDate || undefined
            : toDate || fromDate || undefined
        }
        maxDate={
          customDateField === "from"
            ? toDate || new Date().toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
        }
        minDate={
          customDateField === "to" ? fromDate || undefined : undefined
        }
      onDayPress={(day) => {
  if (customDateField === "from") {
    setFromDate(day.dateString);
    setToDate("");
    setCustomDateField("to");
    // Keep calendar open to select To Date
  } else {
    setToDate(day.dateString);
    setShowCustomCalendar(false);
    // Close only the calendar, not the custom date form
  }
}}
        markedDates={{
          ...(fromDate && {
            [fromDate]: {
              selected: true,
              startingDay: true,
              color: "#2563EB",
              textColor: "#FFFFFF",
            },
          }),
          ...(toDate && {
            [toDate]: {
              selected: true,
              endingDay: true,
              color: "#2563EB",
              textColor: "#FFFFFF",
            },
          }),
        }}
        markingType="period"
        theme={{
          todayTextColor: "#2563EB",
          arrowColor: "#2563EB",
        }}
      />

      <Text style={styles.customCalendarHint}>
        Select your date to continue.
      </Text>
    </View>
  </View>
)}
    </SafeAreaView>
  </MainLayout>
);
  
}




const styles = StyleSheet.create({
  /* ================= SCREEN ================= */

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  /* ================= CUSTOMER SUMMARY ================= */

  customerSection: {
    backgroundColor: "#FFFFFF",
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },

  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    
  },

  storeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  customerDetail: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },

  outstandingCard: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#DC2626",
    alignItems: "flex-end",
  },

  outstandingLabel: {
    fontSize: 9,
    color: "#991B1B",
    fontWeight: "600",
    textTransform: "uppercase",
  },

  outstandingValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#DC2626",
  },

  /* ================= SEARCH ================= */

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: "#1E293B",
  },

  /* ================= LEDGER BLOCK ================= */

  invoiceBlock: {
    paddingVertical: 10,
  },

  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 6,
  },
invoiceDate:
  {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
 invoiceNo:
   {
    fontSize: 10,
    color: "#6B7280",
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  /* ================= AMOUNTS ================= */


  amountBox: {
    flex: 1,
  },

amountLabel: {
  fontSize: 9,
  color: "#64748B",
  textTransform: "uppercase",
  marginBottom: 2,
  textAlign: "center",   // ⬅️ centers text
},

amountValue: {
  fontSize: 12,
  fontWeight: "600",
  color: "#1E293B",
  textAlign: "center",
},

  paidAmount: {
    color: "#10B981",
  },

  outstandingAmount: {
    color: "#DC2626",
  },

  /* ================= ITEMS ================= */

  itemsContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },

  itemHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#F1F5F9",
  },

  itemHeaderText: {
    flex: 2,
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
  },

  itemHeaderQty: {
    width: 60,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },

  itemHeaderPrice: {
    width: 55,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "right",
  },

  itemHeaderTotal: {
    width: 65,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "right",
  },

  itemRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  itemName: {
    flex: 2,
    fontSize: 11,
    color: "#334155",
    fontWeight: "500", 
  },

  itemQty: {
    width: 55,
    fontSize: 11,
    textAlign: "center",
     color: "#64748B",
   
  },

  itemPrice: {
    width: 55,
    fontSize: 11,
    textAlign: "right",
    color: "#64748B",
  },

  itemTotal: {
    width: 65,
    fontSize: 11,
    textAlign: "right",
    fontWeight: "500",
    color: "#10B981",
  },

  /* ================= DIVIDER ================= */

  invoiceDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
    marginTop: 12,
  },

  invoiceContainer: {
  backgroundColor: "#FFFFFF",
  borderRadius: 12,
  marginBottom: 14,
  paddingVertical: 10,
  borderWidth: 1,
  borderColor: "#E5E7EB",
},
invoiceHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 12,
  paddingBottom: 8,
},
amountSummary: {
  flexDirection: "row",
  paddingHorizontal: 12,
  paddingVertical: 6,

  justifyContent: "flex-end",   // ⬅️ shifts content to right
  gap: 14, 
   marginLeft: "auto",                     // keeps same spacing
},


itemsContainer: {
  marginTop: 6,
},
itemHeader: {
  flexDirection: "row",
  paddingVertical: 6,
  paddingHorizontal: 12,
  backgroundColor: "#F8FAFC",
  borderTopWidth: 1,
  borderTopColor: "#F1F5F9",
},
itemRow: {
  flexDirection: "row",
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderTopWidth: 1,
  borderTopColor: "#F1F5F9",
},
amountRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: "#F1F5F9",
},
amountSummary: {
  flexDirection: "row",
  paddingHorizontal: 12,
  paddingVertical: 6,

  justifyContent: "flex-end",   // ⬅️ shifts content to right
  gap: 14,                      // keeps same spacing
},


amountBox: {
  alignItems: "flex-end",
},


inlineActions: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginLeft: 8,
},
iconButton: {
  width: 32,
  height: 32,
  borderRadius: 8,
  backgroundColor: "#EFF6FF",
  alignItems: "center",
  justifyContent: "center",
},

payIcon: {
  backgroundColor: "#10B981",
},

checkbox: {
  width: 18,
  height: 18,
  borderRadius: 4,
  borderWidth: 1.5,
  borderColor: "#CBD5F5",
  alignItems: "center",
  justifyContent: "center",
},
checkboxChecked: {
  backgroundColor: "#2563EB",
  borderColor: "#2563EB",
},
payButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  backgroundColor: "#2563EB", // primary blue
  paddingHorizontal: 18,
  paddingVertical: 10,
  borderRadius: 10,
  shadowColor: "#2563EB",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 6,
  elevation: 4,
},

payButtonDisabled: {
  backgroundColor: "#CBD5F5",
  shadowOpacity: 0,
  elevation: 0,
},

payButtonText: {
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: "700",
  letterSpacing: 0.3,
},
filterBar: {
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderTopWidth: 1,
  borderTopColor: "#F1F5F9",
},

dateChip: {
  borderRadius: 20,
  backgroundColor: "#F3F4F6",
  alignSelf: "flex-start",
},

dateChipActive: {
  backgroundColor: "#2563EB",
},

chipContent: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 12,
  paddingVertical: 6,
},

dateChipText: {
  fontSize: 13,
  fontWeight: "600",
  color: "#374151",
},

dateChipTextActive: {
  color: "#ffffff",
},

clearIcon: {
  marginLeft: 8,
  height: 18,
  width: 18,
  borderRadius: 9,
  backgroundColor: "rgba(255,255,255,0.25)",
  alignItems: "center",
  justifyContent: "center",
},

clearIconText: {
  fontSize: 12,
  fontWeight: "700",
  color: "#ffffff",
},

calendarOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,
},

backdrop: {
  flex: 1,
},

calendarWrapper: {
  position: "absolute",
  top: 180,
  left: 12,
  right: 12,
},

calendar: {
  borderRadius: 12,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  backgroundColor: "#ffffff",
},
/* ================= ACTION ROW ================= */

actionRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderTopWidth: 1,
  borderTopColor: "#F1F5F9",
},

actionButtons: {
  flexDirection: "row",
  gap: 8,
},

/* ================= BUTTONS ================= */

smallBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  backgroundColor: "#2563EB",
},

smallBtnDisabled: {
  backgroundColor: "#CBD5F5",
},

secondaryBtn: {
  backgroundColor: "#EFF6FF",
  borderWidth: 1,
  borderColor: "#BFDBFE",
},

smallBtnText: {
  fontSize: 11,
  fontWeight: "600",
  color: "#FFFFFF",
},

secondaryText: {
  color: "#2563EB",
},
/* ================= STICKY BOTTOM BAR ================= */

bottomBar: {
  position: "absolute",
  left: 30,
  right: 30,
  bottom: 12,
  flexDirection: "row",
  backgroundColor: "#FFFFFF",
  borderRadius: 15,
  padding: 6,
  borderColor: "#E5E7EB",
  borderWidth: 1,
  shadowColor: "#000000",

},

bottomBtn: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: 12,
  borderRadius: 16,
},

bottomBtnText: {
  fontSize: 14,
  fontWeight: "700",
  color: "#0F172A",
},

invoiceHeaderRight: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},

downloadIconBtn: {
  width: 30,
  height: 30,
  borderRadius: 8,
  backgroundColor: "#EFF6FF",
  alignItems: "center",
  justifyContent: "center",
},
editInputName: {
  fontSize: 16,
  fontWeight: "700",
  color: "#111827",
  borderBottomWidth: 1,
  borderBottomColor: "#E5E7EB",
  marginBottom: 6,
},

editInput: {
  fontSize: 12,
  color: "#374151",
  borderBottomWidth: 1,
  borderBottomColor: "#E5E7EB",
  marginBottom: 4,
},

secondarySmallBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  backgroundColor: "#EFF6FF",
  borderWidth: 1,
  borderColor: "#BFDBFE",
},

secondarySmallBtnText: {
  fontSize: 11,
  fontWeight: "600",
  color: "#2563EB",
},

deleteBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  padding: 10,
  margin: 12,
  borderRadius: 10,
  backgroundColor: "#FEF2F2",
  borderWidth: 1,
  borderColor: "#FECACA",
},

deleteBtnText: {
  color: "#DC2626",
  fontSize: 13,
  fontWeight: "700",
},

/* MODAL */
modalOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.4)",
  alignItems: "center",
  justifyContent: "center",
},

modalBox: {
  width: "80%",
  backgroundColor: "#FFFFFF",
  borderRadius: 12,
  padding: 16,
},

modalTitle: {
  fontSize: 16,
  fontWeight: "800",
  color: "#111827",
  marginBottom: 6,
},

modalText: {
  fontSize: 13,
  color: "#6B7280",
  marginBottom: 16,
},

modalActions: {
  flexDirection: "row",
  justifyContent: "flex-end",
  gap: 10,
},

modalCancel: {
  paddingHorizontal: 14,
  paddingVertical: 8,
},

modalCancelText: {
  fontWeight: "700",
  color: "#2563EB",
},

modalDelete: {
  backgroundColor: "#DC2626",
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 8,
},

modalDeleteText: {
  color: "#FFFFFF",
  fontWeight: "700",
},
deleteBtnSmall: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  alignSelf: "flex-end",
  marginTop: 6,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  backgroundColor: "#FEF2F2",
  borderWidth: 1,
  borderColor: "#FECACA",
},

deleteBtnSmallText: {
  fontSize: 11,
  fontWeight: "700",
  color: "#DC2626",
},
selectAllRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingHorizontal: 16,
  paddingVertical: 8,
},

selectAllText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#374151",
 
},
headerActionsRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 12,
  paddingHorizontal: 12,
  paddingBottom: 8,
},

selectAllInline: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingHorizontal: 8,
  paddingVertical: 6,
  borderRadius: 8,
  backgroundColor: "#F3F4F6",
},


headerRight: {
  alignItems: "flex-end",
  gap: 6,
},

editIconBtn: {
  marginTop: 6,
  padding: 6,
  borderRadius: 8,
  backgroundColor: "#EFF6FF",
  borderWidth: 1,
  borderColor: "#BFDBFE",
},

headerActionsRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  paddingHorizontal: 14,
  paddingBottom: 10,
},

selectAllInline: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingLeft: 14,
  marginTop: 5, 

},


selectAllInlineText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#374151",
},


verticalActionButtons: {
  gap: 8,
  alignItems: "flex-end",
},
amountRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: "#F1F5F9",
},

amountSummary: {
  flexDirection: "row",
  paddingVertical: 0,
  justifyContent: "flex-end",
  gap: 14,
  marginLeft: "auto", // 🔥 THIS pushes it fully right
},

amountBox: {
  alignItems: "center", // ✅ centers label relative to value
},

modalOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "center",
  alignItems: "center",
},

paymentModal: {
  width: "85%",
  backgroundColor: "#F7F3FA",
  borderRadius: 24,
  padding: 20,
},

modalTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#111827",
  marginBottom: 16,
},

modalInput: {
  backgroundColor: "#FFFFFF",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#D1D5DB",
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 14,
  marginBottom: 12,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

dropdownText: {
  fontSize: 14,
  color: "#6B7280",
},

modalActionsRow: {
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
  marginTop: 12,
  gap: 20,
},

cancelText: {
  fontSize: 14,
  color: "#6366F1",
  fontWeight: "600",
},

submitBtn: {
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 20,
  elevation: 2,
},

submitText: {
  fontSize: 14,
  fontWeight: "700",
  color: "#6366F1",
},

customerRow: {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 8,
},

details: {
  flex: 1,
},

leftCard: {
  flexDirection: "row",
  flex: 1,
  gap: 10,
  paddingVertical: 6,
},

accentBar: {
  width: 4,
  borderRadius: 2,
  backgroundColor: "#2563EB",
},

details: {
  flex: 1,
},

dropdownMenu: {
  backgroundColor: "#FFFFFF",
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  marginBottom: 12,
  overflow: "hidden",
},

dropdownItem: {
  paddingVertical: 12,
  paddingHorizontal: 14,
},

dropdownItemText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#111827",
},
paymentModal: {
  width: "82%",
  backgroundColor: "#F4EEF6",
  borderRadius: 26,
  padding: 20,
},

dropdownField: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#F9FAFB",
  borderRadius: 10,
  borderWidth: 1.5,
  borderColor: "#D1D5DB",
  paddingHorizontal: 14,
  paddingVertical: 12,
  marginBottom: 8,
},

dropdownFieldActive: {
  borderColor: "#7C3AED",
  backgroundColor: "#F5F3FF",
},

dropdownValue: {
  fontSize: 14,
  fontWeight: "600",
  color: "#111827",
},

dropdownPlaceholder: {
  color: "#9CA3AF",
},

dropdownMenu: {
  backgroundColor: "#FFFFFF",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  marginBottom: 12,
},

dropdownItem: {
  padding: 12,
},

dropdownItemText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#111827",
},

paymentRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",

  backgroundColor: "#F0FDF4",     // 🌿 soft green tint
  borderRadius: 10,

  paddingVertical: 5,
  paddingHorizontal: 5,

  marginTop: 0,
  marginBottom: 10,

  borderWidth: 1,
  borderColor: "#BBF7D0",         // light green border

 
},



paymentLeft: {
  flexDirection: "column",      // 👈 vertical, date on top
},


paymentTitle: {
  fontSize: 12,
  color: "#64748B",             // subtle
  marginTop: 2,
},


paymentDate: {
  fontSize: 14,
  fontWeight: "700",
  color:  "#2563EB",           // strong & readable
},


paymentAmount: {
  fontSize: 15,
  fontWeight: "800",
  color: "#166534",             // still green, but not shouting
},

paymentRemark: {
  fontSize: 12,
  color: "#64748B",   // muted slate
  marginTop: 2,
},

paymentMeta: {
  fontSize: 12,
  color: "#64748B",   // subtle slate
  marginTop: 2,
},

/* ================= COMING SOON SECTION ================= */
comingSoonContainer: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 60,
  paddingHorizontal: 20,
},

comingSoonCard: {
  alignItems: "center",
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  padding: 32,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
},

comingSoonTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#374151",
  marginTop: 16,
  marginBottom: 8,
},

comingSoonText: {
  fontSize: 14,
  color: "#6B7280",
  textAlign: "center",
  lineHeight: 20,
},
reportModal: {
  width: "85%",
  backgroundColor: "#FFFFFF",
  borderRadius: 20,
  padding: 16,
},

reportTitle: {
  fontSize: 16,
  fontWeight: "800",
  color: "#111827",
  marginBottom: 12,
},

reportOption: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 14,
  paddingHorizontal: 12,
  borderRadius: 12,
  backgroundColor: "#F8FAFC",
  marginBottom: 8,
  borderWidth: 1,
  borderColor: "#E5E7EB",
},

reportOptionText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#1F2937",
},

reportCancel: {
  marginTop: 6,
  paddingVertical: 12,
  alignItems: "center",
},

reportCancelText: {
  fontSize: 14,
  fontWeight: "700",
  color: "#DC2626",
},
customerName: {
  fontSize: 13,
  fontWeight: "600",
  color: "#374151",
  marginBottom: 4,
},
returnRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#FFF7ED",
  borderRadius: 10,
  paddingVertical: 10,
  paddingHorizontal: 10,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: "#FED7AA",
},

returnDate: {
  fontSize: 14,
  fontWeight: "700",
  color: "#2563EB",
},

returnMeta: {
  fontSize: 12,
  color: "#9A3412",
  marginTop: 2,
},

returnAmount: {
  fontSize: 15,
  fontWeight: "800",
  color: "#C2410C",
},
customCalendarOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 999,
  elevation: 999,
  justifyContent: "center",
  alignItems: "center",
},

customCalendarBackdrop: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(0,0,0,0.55)",
},

customCalendarCard: {
  width: "90%",
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 14,
  elevation: 20,
},

customCalendarHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
},

customCalendarHint: {
  fontSize: 11,
  color: "#64748B",
  textAlign: "center",
  marginTop: 8,
},

});