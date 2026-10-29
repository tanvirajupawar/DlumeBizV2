import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  COLORS as colors,
  SPACING as spacing,
  RADIUS as radii,
} from "./Colors";

const CARD_GAP = 5;
const GRID_PADDING_H = spacing.md; // horizontal padding for the grid
const GRID_PADDING_TOP = 12;       // small gap between tabs and product grid
const TAB_BAR_HEIGHT = 52;

function ProductCard({ product, cardWidth, onPress }) {
const name = product.product || product.name || 'Unnamed';
const type = product.type || product.product_type || product.category_name || '';

const displayName = type
  ? `${name} - ${type}`
  : name;

const isLongName = displayName.length > 18;
const size = product.size ? String(product.size).trim() : '';
const price = Number(product.price || 0);
  

  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity
style={[
  styles.card,
  {
    width: cardWidth,
    marginRight: CARD_GAP,
    marginBottom: CARD_GAP,
  },
]}
      activeOpacity={1}
      onPress={() => onPress?.(product)}
    >
 <View
  style={[
    styles.imageWrap,
    isLongName && styles.imageWrapSmall,
  ]}
>
  <View
    style={{
      width: "100%",
      height: "100%",
      backgroundColor: "#EEF2F7",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    {product.image && !imageError ? (
     <Image
  source={{ uri: product.image }}
  style={{
    width: "100%",
    height: "100%",
  }}
  resizeMode="cover"
  onError={() => setImageError(true)}
/>
    ) : (
      <Text
        style={{
          fontSize: 38,
          fontWeight: "700",
          color: "#64748B",
        }}
      >
        {(name || "?")
          .trim()
          .split(" ")
          .map(word => word.charAt(0))
          .join("")
          .substring(0, 2)
          .toUpperCase()}
      </Text>
       )}
  </View>

  {!!size && (
    <View style={styles.sizeRibbon}>
      <Text style={styles.sizeRibbonText} numberOfLines={1}>
        {size}
      </Text>
    </View>
  )}
</View>

    <View style={styles.nameWrap}>
  <Text
    numberOfLines={2}
    adjustsFontSizeToFit
    minimumFontScale={0.82}
    style={[
      styles.nameText,
      isLongName && styles.nameTextSmall,
    ]}
  >
    {displayName}
  </Text>
</View>

      <View style={styles.priceWrap}>
        <Text style={styles.priceText}>₹{price.toLocaleString('en-IN')}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OrderPane({
  categories,
  activeCategory,
  onSelectCategory,
  products,
  onProductPress,
  onAddItem,
}) {
    const [containerWidth, setContainerWidth] = useState(0);
  const numColumns = 5;

  const cardWidth =
    containerWidth > 0
      ? Math.floor(
          (containerWidth -
            GRID_PADDING_H * 2 -
            CARD_GAP * (numColumns - 1)) /
            numColumns
        )
      : 0;

  return (
    <View
      style={styles.panel}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Border lives on this wrapper View, not the FlatList's content box */}

<View style={styles.tabBarWrapper}>
  <FlatList
    data={categories}
    horizontal
    keyExtractor={(c) => String(c._id)}
    showsHorizontalScrollIndicator={false}
    style={styles.tabBarList}
    contentContainerStyle={styles.tabRow}
    renderItem={({ item }) => {
      const active = String(item._id) === String(activeCategory);

      return (
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onSelectCategory?.(item._id)}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, active && styles.tabTextActive]}>
            {item.category}
          </Text>

          <View
            style={[
              styles.tabUnderline,
              !active && styles.tabUnderlineHidden,
            ]}
          />
        </TouchableOpacity>
      );
    }}
  />

  <TouchableOpacity
    style={styles.addItemButton}
    onPress={() => onAddItem?.()}
    activeOpacity={0.8}
  >
    <Feather name="plus" size={18} color="#FFFFFF" />
  </TouchableOpacity>
</View>


      {products.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="package" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        containerWidth > 0 && (
          <FlatList
            data={products}
            keyExtractor={(p) => String(p.id || p._id)}
            numColumns={5}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={{ justifyContent: "flex-start" }}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                cardWidth={cardWidth}
                onPress={onProductPress}
              />
            )}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, overflow: 'hidden' },


  tabBarList: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabRow: {
    paddingHorizontal: GRID_PADDING_H,
    height: TAB_BAR_HEIGHT,
  },
  tab: {
    height: TAB_BAR_HEIGHT,
    marginRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
tabText: {
  fontSize: 20,   // or 20
  fontWeight: '600',
  color: colors.textSecondary,
},

tabTextActive: {
  fontSize: 20,   // keep same or use 19
  fontWeight: '700',
  color: colors.textPrimary,
},
  // Pinned to the very bottom of the tab, so it lines up exactly with
  // tabBarWrapper's borderBottomWidth (the horizontal divider line).
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.primary,
  },
  tabUnderlineHidden: { backgroundColor: 'transparent' },
card: {
  width: undefined, // width comes from style prop
  height: 190,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: colors.white,
},

imageWrap: {
  width: "100%",
  height: 120,
  backgroundColor: colors.cardImageBg,
},

nameWrap: {
  height: 35,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 5,
},

nameText: {
  fontSize: 18,
  fontWeight: "600",
  color: colors.textPrimary,
  textAlign: "center",
},

priceWrap: {
  height: 30,
  backgroundColor: "#A7B5D4",
  justifyContent: "center",
  alignItems: "center",
},

priceText: {
  fontSize: 19,
  fontWeight: "700",
  color: "#fff",
},
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },

 gridContent: {
    paddingHorizontal: GRID_PADDING_H,
    paddingTop: GRID_PADDING_TOP,
    paddingBottom: GRID_PADDING_H,
  },
  
addItemButton: {
  height: 36,
  paddingHorizontal: 12,
  borderRadius: 8,
  backgroundColor: colors.primary,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  marginRight: 10,
  alignSelf: "center",
},

addItemButtonText: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "700",
},
tabBarWrapper: {
  minHeight: TAB_BAR_HEIGHT,
  flexDirection: "row",
  alignItems: "center",
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
},
sizeRibbon: {
  position: "absolute",
  top: 8,
  left: 0,
  maxWidth: "70%",
  backgroundColor: colors.primary,
  paddingLeft: 8,
  paddingRight: 12,
  paddingVertical: 3,
  borderTopRightRadius: 6,
  borderBottomRightRadius: 6,
  elevation: 3,
  shadowColor: "#000",
  shadowOpacity: 0.25,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
},

sizeRibbonText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "700",
},
});