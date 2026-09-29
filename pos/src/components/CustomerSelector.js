import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  COLORS as colors,
  SPACING as spacing,
  RADIUS as radii,
} from "./Colors.js";

export const WALK_IN_CUSTOMER = {
  id: 'walk-in',
  name: 'Walk-in Customer',
  phone: null,
};

export default function CustomerSelector({ customers = [], selectedCustomer, onSelectCustomer }) {
  const [visible, setVisible] = useState(false);

  const options = [WALK_IN_CUSTOMER, ...customers];

  const handleSelect = (customer) => {
    onSelectCustomer?.(customer);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)} activeOpacity={0.7}>
        <Feather name="user" size={16} color={colors.primary} />
        <Text style={styles.triggerText} numberOfLines={1}>
          {selectedCustomer?.name || WALK_IN_CUSTOMER.name}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Customer</Text>
            <FlatList
              data={options}
              keyExtractor={(c) => String(c.id || c._id)}
              renderItem={({ item }) => {
                const active = (item.id || item._id) === (selectedCustomer?.id || selectedCustomer?._id);
                return (
                  <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)} activeOpacity={0.7}>
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>{item.name}</Text>
                    {item.phone ? <Text style={styles.rowSub}>{item.phone}</Text> : null}
                    {active && <Feather name="check" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  triggerText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    maxHeight: '70%',
    padding: spacing.md,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  rowText: { flex: 1, fontSize: 14, color: colors.textPrimary },
  rowTextActive: { color: colors.primary, fontWeight: '700' },
  rowSub: { fontSize: 12, color: colors.textSecondary },
  separator: { height: 1, backgroundColor: colors.border },
});