// src/components/HeldCartsSheet.js
import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from './Colors';

const MAX_CONTENT_WIDTH = 720;

const formatPrice = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatCalculatorPrice = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;

const getCustomerName = (customer) =>
  customer?.customer_name ||
  customer?.name ||
  `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() ||
  customer?.company_name ||
  'Walk-in Customer';

const getItemName = (item) =>
  item?.name ||
  item?.product ||
  item?.product_name ||
  item?.item_name ||
  item?.description ||
  'Item';

export default function HeldCartsSheet({
  visible,
  heldCarts = [],
  onRestore,
  onDelete,
  onClose,
}) {
  const confirmDelete = (index, customerName) => {
    Alert.alert(
      'Delete held cart?',
      `This will permanently remove the held cart for ${customerName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(index) },
      ]
    );
  };

  const renderCart = ({ item: cart, index }) => {
    const items = cart.items || [];
    const itemCount = items.length;
    const totalQty = items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
    const total = items.reduce(
      (sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0),
      0
    );
    const customerName = getCustomerName(cart.customer);
    const customerPhone =
      cart.customer?.contact_no_1 ||
      cart.customer?.phone ||
      cart.customer?.mobile ||
      '';

    return (
      <View style={styles.card} testID={`held-cart-row-${index}`}>
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.rowCustomer} numberOfLines={1}>
              {customerName}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {[customerPhone, cart.heldAt].filter(Boolean).join('  ·  ')}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.restoreBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => onRestore?.(index)}
            testID={`held-cart-restore-${index}`}
          >
            <Text style={styles.restoreText}>Restore</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => confirmDelete(index, customerName)}
            hitSlop={12}
            testID={`held-cart-delete-${index}`}
          >
            <Feather name="trash-2" size={18} color={COLORS.danger} />
          </Pressable>
        </View>

        {/* Items */}
        <View style={styles.itemsWrap}>
          {items.map((it, i) => {
            const qty = Number(it.qty) || 0;
            const price = Number(it.price) || 0;
            const isCalc = it.isCalculatorItem === true;

            return (
              <View
                key={`${index}-${i}`}
                style={[
                  styles.itemRow,
                  i === items.length - 1 && styles.itemRowLast,
                ]}
              >
                <View style={styles.itemInfo}>
                  {isCalc ? (
                    <Text style={styles.itemName} numberOfLines={1}>
                      {qty} × {formatCalculatorPrice(price)}
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {getItemName(it)}
                      </Text>
                      <Text style={styles.itemRate}>
                        {qty} × {formatPrice(price)}
                      </Text>
                    </>
                  )}
                  {it.description ? (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {it.description}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.itemTotal}>{formatPrice(price * qty)}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary band */}
        <View style={styles.summary}>
          <Text style={styles.summaryMeta}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'} · {totalQty} qty
          </Text>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>{formatPrice(total)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      testID="held-carts-sheet"
    >
      <SafeAreaView style={styles.safe} testID="held-carts-safe-area">
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={styles.headerIconBtn}
            testID="held-carts-close-button"
          >
            <Ionicons name="close" size={22} color={COLORS.textOnDark} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Held Carts
          </Text>
          {heldCarts.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{heldCarts.length}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.centerCol}>
            {heldCarts.length === 0 ? (
              <Text style={styles.emptyText}>No carts on hold.</Text>
            ) : (
              <FlatList
                data={heldCarts}
                keyExtractor={(_, index) => String(index)}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.cardGap} />}
                showsVerticalScrollIndicator={false}
                renderItem={renderCart}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  header: {
    height: 56,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    marginLeft: -SPACING.xs,
  },
  headerTitle: {
    color: COLORS.textOnDark,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  countBadge: {
    marginLeft: SPACING.sm,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: COLORS.textOnDark,
    fontSize: 12,
    fontWeight: '600',
  },

  body: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  centerCol: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },

  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
    fontSize: 15,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  cardGap: {
    height: SPACING.md,
  },

  /* held cart card */
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.divider,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  cardHeaderText: {
    flex: 1,
  },
  rowCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rowMeta: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  restoreBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  restoreText: {
    color: COLORS.textOnDark,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: SPACING.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },

  /* items */
  itemsWrap: {
    paddingHorizontal: SPACING.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  itemRowLast: {
    borderBottomWidth: 0,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  itemRate: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
    fontVariant: ['tabular-nums'],
  },

  /* summary band */
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.chipBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
  },
  summaryMeta: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  summaryTotalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});