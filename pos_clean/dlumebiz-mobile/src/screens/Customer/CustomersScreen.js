import React, { useState, useMemo, useEffect } from "react";

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MainLayout from "../../layouts/MainLayout";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRef } from "react";
import COLORS from "../../constants/colors";
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchCustomers, addPayment } from "../../api/CustomerApi";
import { updateStutus} from "../../api/SalesApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getCustomersCache,
  saveCustomersCache,
  clearCustomersCache,
} from "../../storage/CacheStored";
import CustomersSkeleton from "../../skeletons/CustomersSkeleton";
import { useFocusEffect } from "@react-navigation/native";




let customersLoadedOnce = false;

export default function CustomersScreen({ navigation }) {
  const [search, setSearch] = useState("");

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(false);
  

const exceededOnceRef = useRef(false);
const lastValidAmountRef = useRef("");

const customersLoadedRef = useRef(false);








const [paymentData, setPaymentData] = useState({
  amount: "",
  date: "",
  remarks: "",
  paymentMode: "",   // ✅ rename
  transactionId: "",
  client_id: "",
  outstanding: 0,
});


  const [showDatePicker, setShowDatePicker] = useState(false);


const handleSubmit = async () => {
  const amount = Number(paymentData.amount);
  const  routes= "Customers";
  const outstanding = Number(paymentData.outstanding);

  if (!amount || !paymentData.paymentMode) {
    alert("Please enter amount and select payment method");
    return;
  }

  if (amount > outstanding) {
    alert(`Payment amount cannot exceed ₹${outstanding}`);
    return;
  }

  try {
    setLoadingPayment(true);

 const result = await addPayment(paymentData);
console.log("🟣 PAYMENT RESPONSE:", result);

// =========================
// PAYMENT SUCCESS
// ALLOW CUSTOMER REFRESH
// =========================
await clearCustomersCache();

setShowPayModal(false);

navigation.replace("PaymentSuccess", {
  amount,
  routes,
});

  } catch (err) {
    console.log("🔴 PAYMENT ERROR:", err);
    navigation.replace("PaymentFailed", { amount, routes });

  } finally {
    setLoadingPayment(false);
  }
};
















/* ---------------- PAGINATION ---------------- */

const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [loadingMore, setLoadingMore] = useState(false);
const [totalOutstanding, setTotalOutstanding] = useState(0);
const [refreshing, setRefreshing] = useState(false);

const loadCustomers = async (pageNumber = 1, append = false) => {
  try {
 if (append) {
  setLoadingMore(true);
} else if (customers.length === 0) {
  setLoading(true);
}

    const result = await fetchCustomers(pageNumber, 10);

const newCustomers = result?.customers || [];

const normalized = newCustomers.map(c => ({
  ...c,
  name:
    c.name ||
    `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
}));

const calculatedOutstanding = normalized.reduce(
  (sum, customer) =>
    sum + Number(customer.outstanding ?? customer.pending_amount ?? 0),
  0
);

if (!append) {
  setTotalOutstanding(calculatedOutstanding);
}

 

    if (append) {
      setCustomers(prev => [...prev, ...normalized]);
    } else {
      setCustomers(normalized);
    }

    setPage(result?.page || pageNumber);
    setTotalPages(result?.totalPages || 1);

return {
  totalPages: result?.totalPages || 1,
totalOutstanding: calculatedOutstanding,
  customers: normalized,
};

  } catch (err) {
    console.log("Error loading customers", err);
    return 1;
  } finally {
    setLoading(false);
    setLoadingMore(false);
  }
};

const handleRefresh = async () => {
  try {
    setRefreshing(true);

    console.log("🔄 PULL TO REFRESH CUSTOMERS...");

    const firstResult = await loadCustomers(1, false);

    if (!firstResult || !firstResult.totalPages) {
      console.log("❌ CUSTOMER REFRESH FAILED");
      return;
    }

    const total = firstResult.totalPages;

    let allCustomers = [
      ...firstResult.customers,
    ];

    for (
      let nextPage = 2;
      nextPage <= total;
      nextPage++
    ) {
      const result = await loadCustomers(
        nextPage,
        true
      );

      if (result?.customers) {
        allCustomers = [
          ...allCustomers,
          ...result.customers,
        ];
      }
    }

    await saveCustomersCache({
      data: allCustomers,
      totalOutstanding:
        firstResult.totalOutstanding,
    });

    console.log(
      "💾 CUSTOMER CACHE UPDATED AFTER PULL:",
      allCustomers.length,
      "TOTAL:",
      firstResult.totalOutstanding
    );

  } catch (error) {
    console.log(
      "❌ PULL TO REFRESH ERROR:",
      error
    );
  } finally {
    setRefreshing(false);
  }
};

useFocusEffect(
  React.useCallback(() => {
    const loadCustomersInBackground = async () => {
      try {
        // =========================
        // 1. ALWAYS RESTORE CACHE
        // =========================
     const cached = await getCustomersCache();

if (cached?.data?.data?.length) {
  console.log(
    "📦 CUSTOMER CACHE RESTORED:",
    cached.data.data.length
  );

  setCustomers(cached.data.data);

  setTotalOutstanding(
    cached.data.totalOutstanding || 0
  );

  setLoading(false);

  if (customersLoadedOnce) {
    return;
  }
}

customersLoadedOnce = true;

console.log("🔄 REFRESHING CUSTOMERS FROM API...");

        const firstResult = await loadCustomers(1, false);

        if (!firstResult || !firstResult.totalPages) {
          console.log(
            "❌ CUSTOMER API REFRESH FAILED"
          );
          return;
        }

        const total = firstResult.totalPages;

        const freshTotalOutstanding =
          firstResult.totalOutstanding;

        // =========================
        // 3. FIRST PAGE
        // =========================
        let allCustomers = [
          ...firstResult.customers,
        ];

        // =========================
        // 4. LOAD REMAINING PAGES
        // =========================
        for (
          let nextPage = 2;
          nextPage <= total;
          nextPage++
        ) {
          const result = await loadCustomers(
            nextPage,
            true
          );

          if (result?.customers) {
            allCustomers = [
              ...allCustomers,
              ...result.customers,
            ];
          }
        }

        // =========================
        // 5. SAVE FRESH CACHE
        // =========================
        await saveCustomersCache({
          data: allCustomers,
          totalOutstanding:
            freshTotalOutstanding,
        });

        console.log(
          "💾 CUSTOMER CACHE UPDATED:",
          allCustomers.length,
          "TOTAL:",
          freshTotalOutstanding
        );

      } catch (error) {
        console.log(
          "❌ CUSTOMER BACKGROUND REFRESH ERROR:",
          error
        );
      }
    };

    loadCustomersInBackground();
  }, [])
);



const handlePrintOutstandingReport = async () => {
  try {
    // Get company details
    const companyString = await AsyncStorage.getItem("company");
    const company = companyString ? JSON.parse(companyString) : {};

    const companyName =
      company?.name ||
      company?.company_name ||
      "D'LumeBiz";

    // Use all customers, not just the currently visible search results
    const reportCustomers = customers;

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
        customer.name ||
        `${customer.first_name || ""} ${customer.last_name || ""}`
      ).trim() || "Unnamed Customer";

    const getOutstanding = (customer) => {
      const amount = Number(
        customer?.outstanding ??
        customer?.remaining_outstanding ??
        customer?.pending_amount ??
        0
      );

      return Number.isFinite(amount) ? amount : 0;
    };

    const totalOutstanding = reportCustomers.reduce(
      (total, customer) => total + getOutstanding(customer),
      0
    );

    const rows = reportCustomers.map((customer, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(getCustomerName(customer))}</td>
        <td>${escapeHtml(customer.company_name || customer.company || "—")}</td>
        <td>${escapeHtml(customer.contact_no_1 || "—")}</td>
        <td class="amount">${money(getOutstanding(customer))}</td>
      </tr>
    `).join("");

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
          }

          .amount {
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
          <div class="company">${escapeHtml(companyName)}</div>
          <div class="title">CUSTOMER OUTSTANDING REPORT</div>
          <div class="date">Report Date: ${reportDate}</div>
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
              <td colspan="4">TOTAL OUTSTANDING</td>
              <td class="amount">${money(totalOutstanding)}</td>
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

    // Generate PDF
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

const loadMoreCustomers = () => {
  if (loadingMore || loading) return;

  if (page >= totalPages) return;

  loadCustomers(page + 1, true);
};




/* ---------------- SEARCH FILTER ---------------- */
const filteredCustomers = useMemo(() => {
  if (!search.trim()) return customers;

  const q = search.toLowerCase();
  return customers.filter(
    (c) =>
      c.company_name?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      String(c.contact_no_1 || "").toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
  );
}, [search, customers]);

/* ---------------- RENDER CUSTOMER ROW ---------------- */
const renderCustomer = ({ item }) => {
  return (
    <View style={styles.row}>
      {/* LEFT (NOT CLICKABLE) */}
   <TouchableOpacity
  style={styles.leftCard}
  activeOpacity={0.7}
  onPress={() =>
    navigation.navigate("CustomerDetails", item.id,)
  }
>
  <View style={styles.accentBar} />

  <View style={styles.details}>
    <Text style={styles.company}>{item.company_name}</Text>
    <Text style={styles.name}>{item.name}</Text>

    {(item.contact_no_1 || item.address) && (
      <Text style={styles.meta}>
        {item.contact_no_1 || "-"} • {item.address || "-"}
      </Text>
    )}
  </View>
</TouchableOpacity>



      {/* RIGHT */}
      <View style={styles.right}>
        <Text
          style={[
            styles.amount,
            item.outstanding === 0 && styles.zeroAmount,
          ]}
        >
          ₹{Number(item.outstanding || 0).toLocaleString("en-IN")}
        </Text>

        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={[
              styles.payBtn,
              item.outstanding === 0 && styles.payBtnDisabled,
            ]}
          onPress={() => {
            navigation.navigate("PaymentScreen", {
              clientId: item.id,
              outstanding: Number(item.outstanding || 0),
              companyName: item.company_name,
              customerName: item.name,
            });
          }}

            disabled={item.outstanding === 0}
            activeOpacity={item.outstanding === 0 ? 1 : 0.7}
          >
            <Ionicons name="card-outline" size={14} color="#FFFFFF" />
            <Text style={styles.payText}>Pay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

 return (
  <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
    <MainLayout navigation={navigation} currentRoute="Customers">
      <View style={styles.container}>
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Customers</Text>

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>TOTAL OUTSTANDING</Text>
            <Text style={styles.totalValue}>
              ₹{totalOutstanding.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

       


        {/* ================= SEARCH + TOTAL ================= */}
        <View style={styles.topBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
              placeholder="Search "
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>

               <TouchableOpacity
            style={styles.reportBtn}
           onPress={handlePrintOutstandingReport}
          >
           <Ionicons name="bar-chart-outline" size={16} color="#ffffff" />

            <Text style={styles.reportText}>Outstanding Reports</Text>
          </TouchableOpacity>

        
        </View>

        {/* ================= TABLE HEADER ================= */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Customer</Text>
          <Text style={styles.tableHeaderText}>Outstanding</Text>
        </View>

 {/* ================= LIST ================= */}
{loading ? (
  <CustomersSkeleton />
) : (
  <FlatList
  data={filteredCustomers}
  renderItem={renderCustomer}
  keyExtractor={(item) => String(item.id || item._id)}

  refreshing={refreshing}
onRefresh={handleRefresh}


  contentContainerStyle={{ paddingBottom: 20 }}

  onEndReached={loadMoreCustomers}
  onEndReachedThreshold={0.5}

  ListFooterComponent={
    loadingMore ? (
      <Text
        style={{
          textAlign: "center",
          paddingVertical: 15,
          color: COLORS.TEXT_SECONDARY,
        }}
      >
        Loading more customers...
      </Text>
    ) : null
  }

  ListEmptyComponent={
    <Text style={styles.emptyText}>No customers found</Text>
  }
/>
)}

    


      </View>


      



    </MainLayout>
</SafeAreaView>    
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },
reportBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,

    backgroundColor: COLORS.PRIMARY,
  borderWidth: 1,
  borderColor: COLORS.INFO,
  

  paddingHorizontal: 14,
  paddingVertical: 9,
  borderRadius: 12,

  // subtle depth
  shadowColor: COLORS.SHADOW,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 4,
  elevation: 2,
},

reportText: {
    color: COLORS.SURFACE,
  fontSize: 13,
  fontWeight: "600",
  letterSpacing: 0.3,
},


  /* SEARCH + TOTAL */
  topBar: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.SURFACE,
  },

  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.BORDER_SOFT,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.TEXT_PRIMARY,
  },

  totalBox: {
    alignItems: "flex-end",
  },

  totalLabel: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: "600",
  },

  totalValue: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.DANGER,
  },

  /* TABLE HEADER */
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.BORDER_SOFT,
  },

  tableHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.PRIMARY,
  },

  /* ROW */
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },

  left: {
    flexDirection: "row",
    flex: 1,
    gap: 10,
  },

  srNo: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
  },

  details: {
    flex: 1,
  },

  company: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },

  name: {
    fontSize: 13,
    color: COLORS.TEXT_PRIMARY,
  },

  meta: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },

  right: {
    alignItems: "flex-end",
    gap: 6,
  },

  amount: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },

  zeroAmount: {
    color: COLORS.TEXT_MUTED,
  },

  viewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: COLORS.INFO,
  },

  viewText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.SURFACE,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: COLORS.TEXT_SECONDARY,
  },

  /* FLOATING ACTION BUTTON */
 fab: {
  position: "absolute",
  right: 20,
  bottom: 24,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: "#2563EB",

  alignItems: "center",
  justifyContent: "center",

  elevation: 6,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 6,
},

fabPressable: {
  width: "100%",
  height: "100%",
  alignItems: "center",
  justifyContent: "center",
},


  actionBtns: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },

  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },

  payBtnDisabled: {
    backgroundColor: COLORS.DISABLED,
  },

  payText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.SURFACE,
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
    backgroundColor: COLORS.PRIMARY,
  },

  dropdownMenu: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginTop: 6,
    overflow: "hidden",
  },

  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  dropdownItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.TEXT_PRIMARY,
  },

  modalActionsRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 18,
},
submitBtn: {
  backgroundColor: COLORS.PRIMARY,     // #2563EB
  paddingHorizontal: 26,
  paddingVertical: 12,
  borderRadius: 999,                  // pill
  alignItems: "center",
  justifyContent: "center",

  // elevation / shadow
  shadowColor: COLORS.SHADOW,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 6,
  elevation: 4,
},
submitText: {
  fontSize: 14,
  fontWeight: "800",
  color: COLORS.SURFACE,              // white
  letterSpacing: 0.3,
},

paymentModal: {
  width: "85%",
  maxHeight: "75%",        // 👈 REQUIRED for scroll
  backgroundColor: COLORS.SURFACE,
  borderRadius: 24,
  padding: 20,
},
paymentModal: {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  width: '90%',
  maxHeight: '80%', // Add this
  padding: 20,
},


  /* ================= OVERLAY ================= */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* ================= iOS FIX: KeyboardAvoidingView wrapper ================= */
  keyboardAvoidingView: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ================= MODAL CARD ================= */
  editModalCard: {
    width: "88%",
    maxHeight: "90%",
    backgroundColor: COLORS.SURFACE,
    borderRadius: 18,
    padding: 18,

    elevation: 10,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },

  /* ================= TITLE ================= */
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 14,
  },

  /* ================= FIELD ================= */
  field: {
    marginBottom: 12,
  },

  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 6,
  },

  /* ================= INPUT ================= */
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: COLORS.SURFACE,
    color: COLORS.TEXT_PRIMARY,
  },

  /* ================= ACTIONS ================= */
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
  },

  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.TEXT_SECONDARY,
  },

  saveBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 999,        // pill

    alignItems: "center",
    justifyContent: "center",

    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  saveText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.SURFACE,
    letterSpacing: 0.3,
  },
  dateInput: {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: COLORS.BORDER,
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: COLORS.SURFACE,
},
requiredStar: {
  color: COLORS.DANGER,
},

});