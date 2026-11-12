import React, { useState, useCallback  } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { Animated, Easing, PanResponder, Vibration } from "react-native";

import { useRef, useEffect } from "react";
import COLORS from "../../constants/colors";
import MainLayout from "../../layouts/MainLayout";
import { fetchSales } from "../../api/SalesApi";
import { fetchCollections } from "../../api/CollectionsApi";
import {
  getSalesCache,
  saveSalesCache,
  getReceiptsCache,
  saveReceiptsCache,
  getCollectionsCache,
  saveCollectionsCache,
} from "../../storage/CacheStored";





const SaleOrdersListScreen = ({ navigation }) => {
  // const [searchQuery, setSearchQuery] = useState("");

  const [data, setData] = useState([]);
const [collections, setCollections] = useState([]);


  const [loading, setLoading] = useState(true);


const [selectedDate, setSelectedDate] = useState(null);
const [showCalendar, setShowCalendar] = useState(false);
const [expandedIds, setExpandedIds] = useState([]);


const [activeTab, setActiveTab] = useState("Sales"); // "Sales" | "Collections"








 const toggleExpand = (id) => {
  setExpandedIds((prev) =>
    prev.includes(id)
      ? prev.filter((itemId) => itemId !== id) // close this one
      : [...prev, id] // open this one
  );
};


const formatAmount = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;


  const renderItem = ({ item }) => {
    const isExpanded = expandedIds.includes(item.id);





    return (
      <View style={styles.invoiceCard}>
        {/* Main Row - Clickable */}
      <TouchableOpacity
  style={styles.mainRow}
  onPress={() => toggleExpand(item.id)}
  activeOpacity={0.7}
>

{/* LEFT BLOCK (checkbox + company info) */}
<View style={styles.leftBlock}>

  {/* Company & Invoice Info */}
  <View style={styles.infoSection}>
    <Text style={styles.companyName}>{item.companyName}</Text>
    <View style={styles.metaInfo}>
      <Text style={styles.date}>{item.date}</Text>
      <Text style={styles.separator}>•</Text>
      <Text style={styles.invoiceNo}>{item.invoiceNo}</Text>
    </View>
</View>

<View style={styles.amountSection}>
  <Text style={styles.amount}>
    {formatAmount(item.total)}
  </Text>
</View>

</View>
</TouchableOpacity>

        {/* Expanded Items Section */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            {/* Items Table Header */}
      <View style={styles.itemsHeader}>
  <Text style={[styles.itemsHeaderText, { flex: 1.5 }]}>Item</Text>
  <Text style={[styles.itemsHeaderText, { flex: 1 }]}>Bags</Text>
  <Text style={[styles.itemsHeaderText, { flex: 0.8 }]}>Qty</Text>
  <Text style={[styles.itemsHeaderText, { flex: 0.9 }]}>Price</Text>
  <Text style={[styles.itemsHeaderText, { flex: 1 }]}>Total</Text>
</View>

{item.items.map((invoiceItem, index) => (
  <View key={index} style={styles.itemRow}>
    <View style={{ flex: 1.5 }}>
      <Text style={[styles.itemText, styles.itemNameBold]}>
        {invoiceItem.product_name || "Item"}
      </Text>
      {!!invoiceItem.type && (
        <Text style={styles.itemSubText}>
          ({invoiceItem.type})
        </Text>
      )}
    </View>

    <Text style={[styles.itemText, { flex: 1 }]}>
      {invoiceItem.bags && invoiceItem.units_per_bag
        ? `${invoiceItem.bags} × ${invoiceItem.units_per_bag}`
        : "-"}
    </Text>

    <Text style={[styles.itemText, { flex: 0.8 }]}>
      {Number(invoiceItem.qty) || 0}
    </Text>

    <Text style={[styles.itemText, { flex: 0.9 }]}>
      ₹{Number(invoiceItem.rate || 0).toLocaleString("en-IN")}
    </Text>

    <Text style={[styles.itemText, styles.itemTextBold, { flex: 1 }]}>
      ₹{Number(invoiceItem.amount || 0).toLocaleString("en-IN")}
    </Text>
  </View>
))}


          


          </View>
        )}
      </View>
    );
  };








const normalizeInvoiceDate = (date) => {
  // "08/01/2026" → "2026-01-08"
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}`;
};

const normalizeCollectionDate = (date) => {
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}`;
};


// FILTER FIRST
const filteredData = data.filter(item => {
  if (!selectedDate) return true;
  return normalizeInvoiceDate(item.date) === selectedDate;
});





// THEN REDUCE
const totalSales = filteredData.reduce(
  (sum, item) => sum + item.total,
  0
);


const filteredCollections = collections.filter((item) => {
  if (!selectedDate) return true;
  return normalizeCollectionDate(item.date) === selectedDate;
});

const totalCollections = filteredCollections.reduce(
  (sum, item) => sum + Number(item.amount || 0),
  0
);

const chipScale = useRef(new Animated.Value(1)).current;
const calendarAnim = useRef(new Animated.Value(0)).current; // slide animation


useFocusEffect(
  useCallback(() => {
    let isMounted = true;
    let intervalId;

 const loadSales = async () => {
  try {
    // Load Sales
    const cachedSales = await getSalesCache();

    if (cachedSales?.data && isMounted) {
      setData(cachedSales.data);
    }

    const salesResult = await fetchSales();

    if (salesResult?.sales && isMounted) {
      const activeSales = salesResult.sales;

      setData(activeSales);
      saveSalesCache(activeSales);
    }

    // Load Collections (Customer Payments)
    const cachedCollections = await getCollectionsCache();

    if (cachedCollections?.data && isMounted) {
      setCollections(cachedCollections.data);
    }

    const collectionsResult = await fetchCollections();

    if (collectionsResult?.collections && isMounted) {
      setCollections(collectionsResult.collections);
      saveCollectionsCache(collectionsResult.collections);
    }

  } catch (e) {
    console.log("Sales / Collections load error:", e);
  }
};
    // initial load
    loadSales();

    // refresh every 15 seconds
    intervalId = setInterval(loadSales, 15000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [])
);






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



  return (

           <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>     

   <MainLayout navigation={navigation} currentRoute="SaleOrders">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />


{/* Header */}
<View style={styles.header}>
  <View style={styles.headerLeft}>
<Text style={styles.headerTitle}>
  {activeTab === "Sales" ? "Sales" : "Collections"}
</Text>
    <Text style={styles.headerMeta}>
      {activeTab === "Sales" ? "Sales Overview" : "Collections Overview"}
    </Text>
  </View>

  <View style={styles.headerRight}>
<Text style={styles.headerAmountLabel}>
  {activeTab === "Sales" ? "TOTAL SALES" : "TOTAL COLLECTIONS"}
</Text>

<Text style={styles.headerAmount}>
  {formatAmount(
    activeTab === "Sales" ? totalSales : totalCollections
  )}
</Text>
</View>


</View>
<View style={styles.tabWrapper}>
  <View style={styles.tabContainer}>
    {["Sales", "Collections"].map((tab) => (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tabBtn,
          activeTab === tab && styles.activeTab,
        ]}
        onPress={() => setActiveTab(tab)}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === tab && styles.activeTabText,
          ]}
        >
          {tab === "Sales" ? "Invoices" : "Collections"}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>

<View style={styles.filterBar}>
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    <TouchableOpacity
      style={styles.dateChip}
      onPress={() => setShowCalendar(true)}
    >
      <View style={styles.chipContent}>
        <Text style={styles.dateChipText}>
          📅 {selectedDate || "Date"}
        </Text>
      </View>
    </TouchableOpacity>

    {selectedDate && (
      <TouchableOpacity
        onPress={() => {
          setSelectedDate(null);
          setShowCalendar(false);
        }}
        style={{ marginLeft: 12, padding: 8 }}
      >
        <Text style={{ color: "#DC2626", fontWeight: "600" }}>
          ✕ Clear
        </Text>
      </TouchableOpacity>
    )}
  </View>
</View>





{showCalendar && (
  <View style={styles.calendarOverlay}>
    {/* Click outside area */}
    <TouchableOpacity
      style={styles.backdrop}
      activeOpacity={1}
      onPress={() => setShowCalendar(false)}
    />

    {/* Calendar container */}
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



{/* CONTENT */}

{activeTab === "Sales" ? (
  <FlatList
    data={filteredData}
    renderItem={renderItem}
    keyExtractor={(item) => item.id?.toString()}
    contentContainerStyle={styles.listContent}
    showsVerticalScrollIndicator={false}
    ListEmptyComponent={
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No sales found</Text>
      </View>
    }
  />
) : (
  <FlatList
    data={filteredCollections}
    keyExtractor={(item) => item.id?.toString()}
    contentContainerStyle={styles.listContent}
    showsVerticalScrollIndicator={false}
    renderItem={({ item }) => (
      <View style={styles.collectionCard}>
        <View style={styles.collectionTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.collectionName}>
              {item.customerName || "Walk-in Customer"}
            </Text>

            <Text style={styles.collectionMeta}>
              {item.date || "-"}  •  Invoice: {item.invoice_no || "-"}
            </Text>
          </View>

          <Text style={styles.collectionAmount}>
            {formatAmount(item.amount)}
          </Text>
        </View>

        <View style={styles.collectionBottom}>
          <View style={styles.modeBadge}>
            <Text style={styles.modeText}>
              {item.payment_method || "Other"}
            </Text>
          </View>

          {!!item.reference_no && (
            <Text style={styles.collectionMeta}>
              Ref: {item.reference_no}
            </Text>
          )}
        </View>

        {!!item.remarks && (
          <Text style={styles.collectionMeta}>
            Remarks: {item.remarks}
          </Text>
        )}
      </View>
    )}
    ListEmptyComponent={
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No collections found</Text>
      </View>
    }
  />
)}


         </MainLayout>

      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

 
  totalLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    marginBottom: 4,
  },

  totalAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "right",
  },

  // Search
  searchContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },

  searchInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A1A1A",
  },

  // List
  listContent: {
    padding: 24,
    paddingBottom: 100,
  },

  // Invoice Card
  invoiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  mainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },

  infoSection: {
    flex: 1,
    marginRight: 16,
  },

  companyName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 6,
  },

  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  invoiceNo: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },

  separator: {
    fontSize: 14,
    color: "#CCC",
    marginHorizontal: 8,
  },

  date: {
    fontSize: 11,
    color: "#666",
  },

  amountSection: {
    alignItems: "flex-end",
  },

  amount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },


  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Expanded Section
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FAFAFA",
  },

  itemsContainer: {
    padding: 20,
  },

  itemsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  itemLeft: {
    flex: 1,
    marginRight: 16,
  },

  itemName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1A1A1A",
    marginBottom: 4,
  },

  itemMeta: {
    fontSize: 13,
    color: "#999",
  },

  itemTotal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },

  downloadBtn: {
    flex: 1,
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },

  downloadBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  editBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#007BFF",
  },

  editBtnText: {
    color: "#007BFF",
    fontSize: 15,
    fontWeight: "600",
  },

  deleteBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#DC3545",
  },

  deleteBtnText: {
    color: "#DC3545",
    fontSize: 15,
    fontWeight: "600",
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007BFF",
    justifyContent: "center",
    alignItems: "center",
   
  },

  fabText: {
    fontSize: 30,
    color: "#FFFFFF",
    fontWeight: "300",
  },

  // Empty State
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
  },

  emptyText: {
    fontSize: 16,
    color: "#999",
  },

  // Expanded Section
  expandedSection: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },

  expandedTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 10,
  },

  itemsHeader: {
    flexDirection: "row",
    backgroundColor: "#E8EAED",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 4,
  },

  itemsHeaderText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#2C3E50",
    textAlign: "start",
  },

  itemRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },

  itemText: {
    fontSize: 11,
    color: "#34495E",
    textAlign: "start",
  },

  itemTextBold: {
    fontSize: 11,
    fontWeight: "700",
    color: "#27AE60",
    textAlign: "center",
  },

  invoiceActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  invoiceActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  invoiceBtn: {
    flex: 1,
    paddingVertical: 6, // ⬇ smaller height
    borderRadius: 20, // pill style
    alignItems: "center",
    justifyContent: "center",
  },

  /* Edit */
  editBtn: {
    backgroundColor: "#2563EB",
  },

  /* Download */
  downloadBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  /* Delete */
  deleteBtn: {
    backgroundColor: "#FFF1F2",
  },

  /* TEXT */
  editBtnText: {
    color: "#FFFFFF",
    fontSize: 11, // ⬇ smaller text
    fontWeight: "600",
  },

  downloadBtnText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "600",
  },

  deleteBtnText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "600",
  },

  AccountBtnText: {
    color: "#0284C7",
    fontSize: 11,
    fontWeight: "600",
  },

  AccountBtn: {
    backgroundColor: "#E0F2FE",
  },

  filterLabel: {
  fontSize: 13,
  fontWeight: '600',
  color: '#475569',
  marginBottom: 8,
},
filterLabel: {
  fontSize: 13,
  fontWeight: "600",
  color: "#475569",
  marginBottom: 8,
},

datePickerBtn: {
  backgroundColor: "#F8FAFC",
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderWidth: 1,
  borderColor: "#E2E8F0",
},

datePickerText: {
  fontSize: 15,
  color: "#1E293B",
},

calendar: {
  marginTop: 12,
  borderRadius: 12,
  elevation: 3,
},

clearFilterBtn: {
  marginTop: 10,
  alignSelf: "flex-start",
},

clearFilterText: {
  color: "#DC2626",
  fontSize: 13,
  fontWeight: "600",
},

collectionContainer: {
  padding: 24,
  alignItems: "center",
  justifyContent: "center",
},

collectionTitle: {
  fontSize: 18,
  fontWeight: "700",
  marginBottom: 6,
  color: "#1E293B",
},

collectionSub: {
  fontSize: 14,
  color: "#64748B",
},
collectionCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  elevation: 2,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 3,
},

collectionTop: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

collectionName: {
  fontSize: 15,
  fontWeight: "600",
  color: "#1E293B",
  marginBottom: 4,
},

collectionMeta: {
  fontSize: 13,
  color: "#64748B",
},

collectionAmount: {
  fontSize: 17,
  fontWeight: "700",
  color: "#16A34A",
},

collectionBottom: {
  marginTop: 12,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

modeBadge: {
  backgroundColor: "#E0F2FE",
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
},

modeText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#0284C7",
},

collectionStatus: {
  fontSize: 12,
  fontWeight: "700",
  textTransform: "uppercase",
},

statusReceived: {
  color: "#16A34A",
},

statusPartial: {
  color: "#F97316",
},


totalBox: {
  alignItems: "flex-end",
},

totalLabel: {
  fontSize: 11,
  color: "#6B7280",
  fontWeight: "600",
  marginBottom: 2,
},

totalAmount: {
  fontSize: 18,
  fontWeight: "700",
  color: "#111827",
},


header: {
  backgroundColor: "#ffffff",
  paddingHorizontal: 16,
  paddingVertical: 14,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottomWidth: 1,
  borderBottomColor: "#E5E7EB",
},

headerLeft: {
  flexDirection: "column",
},

headerTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#111827",
},

headerMeta: {
  fontSize: 13,
  color: "#6B7280",
  marginTop: 2,
},

headerRight: {
  alignItems: "flex-end",
},

headerAmountLabel: {
  fontSize: 11,
  color: "#9CA3AF",
  letterSpacing: 0.8,
  fontWeight: "600",
},

headerAmount: {
  fontSize: 18,
  fontWeight: "700",
  color: "#16A34A", // green for sales
  marginTop: 4,
},
tabWrapper: {
  backgroundColor: "#ffffff",
  paddingHorizontal: 16,
  paddingVertical: 12,
},

tabContainer: {
  flexDirection: "row",
  backgroundColor: "#F3F4F6",
  borderRadius: 10,
  padding: 4,
},

tabBtn: {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 8,
  alignItems: "center",
},

activeTab: {
  backgroundColor: "#111827",
},

tabText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#6B7280",
},

activeTabText: {
  color: "#ffffff",
},

filterBar: {
  paddingHorizontal: 16,
  paddingVertical: 6,
  backgroundColor: "#ffffff",
  borderBottomWidth: 1,
  borderBottomColor: "#E5E7EB",
},

dateChip: {
  borderRadius: 20,
  backgroundColor: "#F3F4F6",
  overflow: "hidden",
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
  flexShrink: 1,
},

dateChipTextActive: {
  color: "#ffffff",
},

clearIcon: {
  marginLeft: 8,
},

clearIconText: {
  fontSize: 14,
  fontWeight: "700",
  color: "#ffffff",
},

calendarWrapper: {
  marginHorizontal: 16,
},

calendar: {
  marginTop: 6,
  borderRadius: 12,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "#E5E7EB",
},
dateChip: {
  borderRadius: 20,
  backgroundColor: "#F3F4F6",
  overflow: "hidden",
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
  flexShrink: 1,
},

dateChipTextActive: {
  color: "#ffffff",
},

/* Clear Button */
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
  top: 200, // adjust if needed (below filter bar)
  left: 16,
  right: 16,
},

calendar: {
  borderRadius: 12,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  backgroundColor: "#ffffff",
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
  flexShrink: 1,
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
modeRow: {
  flexDirection: "row",
  alignItems: "center",
},

receiverInline: {
  fontSize: 12,
  color: "#374151",
  marginLeft: 8,
  fontWeight: "500",
},

modeReceiverBadge: {
  flexDirection: "row",
  flexWrap: "wrap",         
  alignItems: "center",
  backgroundColor: "#F3F4F6",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 14,
  maxWidth: "50%",         
},


modeReceiverText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#2563EB", // payment mode highlight
},

modeReceiverSeparator: {
  marginHorizontal: 6,
  color: "#9CA3AF",
  fontSize: 12,
},

receiverNameText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#111827", // receiver name emphasis
},
remarkText: {
  fontSize: 12,
  fontWeight: "500",
  color: "#374151",
},
itemSubText: {
  fontSize: 9,
  color: "#64748B", // muted gray
  marginTop: 2,
},
itemNameBold: {
  fontWeight: "700",
},
checkbox: {
  width: 20,
  height: 20,
  borderRadius: 4,
  borderWidth: 1.5,
  borderColor: "#16A34A",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 10,
  backgroundColor: "#ffffff",
   marginTop: 3,
},

checkboxActive: {
  backgroundColor: "#16A34A",
},

checkMark: {
  color: "#ffffff",
  fontSize: 10,
  fontWeight: "900",
  lineHeight: 12,
},
leftBlock: {
  flexDirection: "row",
  alignItems: "flex-start", // 🔥 THIS fixes alignment
  flex: 1,
},



});

export default SaleOrdersListScreen;
