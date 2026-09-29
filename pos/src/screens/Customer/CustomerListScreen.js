import React, { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ScrollView,
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

const getCompany = (c) =>
  c.company_name || c.company || "";

const money = (value) =>
  "₹" +
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ──────────────────────────────────────────────────────────────

export default function CustomerListScreen({
  customers = [],
  onCustomerPress,
  onPayPress,
}) {
  const filteredCustomers = useMemo(() => {
    return customers;
  }, [customers]);

  const renderRow = ({ item }) => {
    const outstanding = Number(item?.outstanding || 0);

    return (
      <Pressable
        onPress={() => onCustomerPress?.(item)}
        style={({ pressed }) => [
          styles.tr,
          pressed && styles.trPressed,
        ]}
      >
        <Text
          style={[styles.tdName, styles.colName]}
          numberOfLines={1}
        >
          {getName(item)}
        </Text>

        <Text
          style={[styles.td, styles.colPhone]}
          numberOfLines={1}
        >
          {getPhone(item) || "—"}
        </Text>

        <Text
          style={[styles.td, styles.colCompany]}
          numberOfLines={1}
        >
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

        <View style={styles.colPay}>
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              onPayPress?.(item);
            }}
            style={({ pressed }) => [
              styles.payButton,
              pressed && styles.payButtonPressed,
            ]}
          >
            <Text style={styles.payButtonText}>
              PAY
            </Text>
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
            <Text style={[styles.th, styles.colName]}>
              Name
            </Text>

            <Text style={[styles.th, styles.colPhone]}>
              Phone
            </Text>

            <Text style={[styles.th, styles.colCompany]}>
              Company
            </Text>

            <Text
              style={[
                styles.th,
                styles.colOutstanding,
              ]}
            >
              Outstanding
            </Text>

            <Text
              style={[
                styles.th,
                styles.colPay,
                styles.actionHeader,
              ]}
            >
              Action
            </Text>
          </View>

          {/* Customer Rows */}
          {filteredCustomers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                No customers found
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
    minWidth: 620,
    backgroundColor: COLORS.card,
  },

  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },

  thRow: {
    backgroundColor: COLORS.bg,
    paddingVertical: SPACING.md,
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

  th: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  td: {
    fontSize: 20,
    color: COLORS.textPrimary,
  },

  tdName: {
    fontSize: 21,
    fontWeight: "600",
    color: COLORS.blue,
  },

  tdMoney: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  tdDue: {
    color: COLORS.danger,
  },

  colName: {
    flex: 2.2,
    paddingRight: SPACING.md,
  },

  colPhone: {
    flex: 1.5,
    paddingRight: SPACING.md,
  },

  colCompany: {
    flex: 2,
    paddingRight: SPACING.md,
  },

  colOutstanding: {
    flex: 1.6,
    paddingRight: SPACING.md,
  },

  colPay: {
    flex: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  payButton: {
    minWidth: 90,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  payButtonPressed: {
    opacity: 0.7,
  },

  payButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textOnDark,
  },

  actionHeader: {
    textAlign: "center",
  },
});