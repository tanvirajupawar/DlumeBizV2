import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";

import { COLORS, SPACING } from "../../components/Colors";

// ── Field helpers ──────────────────────────────────────────────

const getName = (c) =>
  (
    c.customer_name ||
    `${c.first_name || ""} ${c.last_name || ""}`
  ).trim() || "Unnamed Customer";

const getPhone = (c) => c.contact_no_1 || "";

const getCompany = (c) => c.company_name || c.company || "";

const money = (value) =>
  "₹" +
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── Print summary ranges ───────────────────────────────────────

const SUMMARY_RANGES = [
  { key: "1d", label: "1 Day", days: 1 },
  { key: "1w", label: "1 Week", days: 7 },
  { key: "1m", label: "1 Month", months: 1 },
  { key: "3m", label: "3 Months", months: 3 },
  { key: "6m", label: "6 Months", months: 6 },
  { key: "all", label: "All" },
];

const getRangeStart = (range) => {
  if (!range.days && !range.months) return null; // "all"
  const d = new Date();
  if (range.days) d.setDate(d.getDate() - range.days);
  if (range.months) d.setMonth(d.getMonth() - range.months);
  return d;
};

// ──────────────────────────────────────────────────────────────

export default function CustomerListScreen({
  customers = [],
  onCustomerPress,
  onPayPress,
  onPrintSummary,
  searchValue = "",
}) {
  const search = searchValue;
  const [summaryCustomer, setSummaryCustomer] = useState(null);

  const handleSelectRange = (range) => {
    const customer = summaryCustomer;
    setSummaryCustomer(null);
    onPrintSummary?.(customer, {
      key: range.key,
      label: range.label,
      from: getRangeStart(range), // Date or null for "all"
      to: new Date(),
    });
  };

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;

    return customers.filter((c) => {
      const name = getName(c).toLowerCase();
      const phone = String(getPhone(c)).toLowerCase();
      const company = getCompany(c).toLowerCase();

      return (
        name.includes(q) || phone.includes(q) || company.includes(q)
      );
    });
  }, [customers, search]);

  const renderRow = ({ item, index }) => {
    const outstanding = Number(item?.outstanding || 0);

    return (
      <Pressable
        onPress={() => onCustomerPress?.(item)}
        style={({ pressed }) => [styles.tr, pressed && styles.trPressed]}
      >
        <Text style={[styles.td, styles.colSr]} numberOfLines={1}>
          {index + 1}
        </Text>

        <Text style={[styles.tdName, styles.colName]} numberOfLines={1}>
          {getName(item)}
        </Text>

        <Text style={[styles.td, styles.colPhone]} numberOfLines={1}>
          {getPhone(item) || "—"}
        </Text>

        <Text style={[styles.td, styles.colCompany]} numberOfLines={1}>
          {getCompany(item) || "—"}
        </Text>

        <Text
          style={[
            styles.tdMoney,
            styles.colOutstanding,
            outstanding > 0 && styles.tdDue,
          ]}
          numberOfLines={1}
        >
          {money(outstanding)}
        </Text>

        <View style={styles.colActions}>
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              setSummaryCustomer(item);
            }}
            style={({ pressed }) => [
              styles.printButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.printButtonText}>PRINT</Text>
          </Pressable>

          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              onPayPress?.(item);
            }}
            style={({ pressed }) => [
              styles.payButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.payButtonText}>PAY</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContent}
      >
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tr, styles.thRow]}>
            <Text style={[styles.th, styles.colSr]}>Sr</Text>
            <Text style={[styles.th, styles.colName]}>Name</Text>
            <Text style={[styles.th, styles.colPhone]}>Phone</Text>
            <Text style={[styles.th, styles.colCompany]}>Company</Text>
            <Text style={[styles.th, styles.colOutstanding]}>
              Outstanding
            </Text>
            <View style={styles.colActions}>
              <Text style={styles.th}>Action</Text>
            </View>
          </View>

          {/* Customer Rows */}
          {filteredCustomers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                {search.trim()
                  ? "No matching customers"
                  : "No customers found"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item, index) =>
                String(item._id || item.id || index)
              }
              renderItem={renderRow}
              ItemSeparatorComponent={() => (
                <View style={styles.rowDivider} />
              )}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </ScrollView>

      {/* Print Summary Modal */}
      <Modal
        visible={!!summaryCustomer}
        transparent
        animationType="fade"
        onRequestClose={() => setSummaryCustomer(null)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setSummaryCustomer(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Print Summary</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {summaryCustomer ? getName(summaryCustomer) : ""}
                </Text>
              </View>

              <Pressable
                onPress={() => setSummaryCustomer(null)}
                hitSlop={10}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>SELECT PERIOD</Text>

            <View style={styles.rangeGrid}>
              {SUMMARY_RANGES.map((range) => (
                <Pressable
                  key={range.key}
                  onPress={() => handleSelectRange(range)}
                  style={({ pressed }) => [
                    styles.rangeChip,
                    pressed && styles.rangeChipPressed,
                  ]}
                >
                  <Text style={styles.rangeChipText}>{range.label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: COLORS.card,
  },

  horizontalContent: {
    flexGrow: 1,
    width: "100%",
  },

  table: {
    flex: 1,
    width: "100%",
    minWidth: 820,
    backgroundColor: COLORS.card,
  },

  // ── Rows ──
  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },

  thRow: {
    backgroundColor: COLORS.bg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  rowDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },

  trPressed: {
    opacity: 0.6,
  },

  // ── Text ──
  th: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  td: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },

  tdName: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.blue,
  },

  tdMoney: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  tdDue: {
    color: COLORS.danger,
  },

  // ── Columns (same styles used by header + rows, so they always align) ──
  colSr: {
    flex: 0.5,
    paddingRight: SPACING.md,
  },

  colName: {
    flex: 2,
    paddingRight: SPACING.md,
  },

  colPhone: {
    flex: 1.4,
    paddingRight: SPACING.md,
  },

  colCompany: {
    flex: 1.8,
    paddingRight: SPACING.md,
  },

  colOutstanding: {
    flex: 1.4,
    paddingRight: SPACING.md,
  },

  // Fixed width so buttons never overflow and header lines up
  colActions: {
    width: 190,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  // ── Empty ──
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  // ── Buttons ──
  payButton: {
    width: 80,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.blue,
    borderWidth: 1.5,
    borderColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  payButtonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: COLORS.textOnDark,
  },

  printButton: {
    width: 80,
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.blue,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },

  printButtonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: COLORS.blue,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  // ── Modal ──
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  modalHeaderText: {
    flex: 1,
    paddingRight: 10,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  modalSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },

  modalLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },

  rangeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  rangeChip: {
    width: "31%",
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  rangeChipPressed: {
    borderColor: COLORS.blue,
    opacity: 0.8,
  },

  rangeChipText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
});