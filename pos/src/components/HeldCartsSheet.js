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
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from './Colors';

/**
 * Full-screen modal listing every held cart — same chrome as
 * ManageCartItemModal: dark header with title, content in a centered
 * max-width column instead of edge-to-edge / bottom-sheet.
 */
const MAX_CONTENT_WIDTH = 720;

export default function HeldCartsSheet({ visible, heldCarts = [], onRestore, onDelete, onClose }) {
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
            <Ionicons name="close" size={26} color={COLORS.textOnDark} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Held Carts
          </Text>
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
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => {
                  const itemCount = item.items?.length || 0;
                  const qty = (item.items || []).reduce((sum, i) => sum + i.qty, 0);
                  return (
                    <Pressable
                      style={styles.row}
                      onPress={() => onRestore?.(index)}
                      testID={`held-cart-row-${index}`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowCustomer}>
                          {item.customer?.name || 'Walk-in Customer'}
                        </Text>
                        <Text style={styles.rowMeta}>{itemCount} items · {qty} qty</Text>
                        <Text style={styles.rowTime}>{item.heldAt}</Text>
                      </View>
                      <Pressable
                        style={styles.restoreBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          onRestore?.(index);
                        }}
                        testID={`held-cart-restore-${index}`}
                      >
                        <Text style={styles.restoreText}>Restore</Text>
                      </Pressable>
                    <Pressable
  style={styles.deleteBtn}
  onPress={(e) => {
    e.stopPropagation();
    onDelete?.(index);
  }}
  hitSlop={12}
  testID={`held-cart-delete-${index}`}
>
  <Feather name="trash-2" size={24} color={COLORS.danger} />
</Pressable>
                     
                    </Pressable>
                  );
                }}
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
    height: 72,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  headerTitle: {
    color: COLORS.textOnDark,
    fontSize: 22,
    fontWeight: '700',
  },

  body: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },

  /* centers content in a max-width column, matching ManageCartItemModal */
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
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: SPACING.lg,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  rowCustomer: {
    fontSize: 21,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rowMeta: {
    fontSize: 19,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rowTime: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  restoreBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  restoreText: {
    color: COLORS.textOnDark,
    fontSize: 13,
    fontWeight: '700',
  },
deleteBtn: {
  padding: SPACING.sm,
  alignItems: "center",
  justifyContent: "center",
},
});