// components/ProductGrid.js
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProductCard from './ProductCard';
import {
  COLORS as colors,
  RADIUS as radii,
  SPACING as spacing,
} from "../components/Colors";

export default function ProductGrid({
  products = [],
  numColumns = 5,
  onProductPress = () => {},
}) {
  const [containerWidth, setContainerWidth] = useState(0);

  const itemWidth = containerWidth > 0 ? containerWidth / numColumns : 0;

const renderItem = useCallback(
  ({ item }) => {
    console.log("Rendering:", item.product);

    return (
      <View
      style={{
        width: itemWidth,
        paddingHorizontal: 6,
        marginBottom: 12,
      }}
    >
      <ProductCard
        product={item}
        onPress={onProductPress}
      />
    </View>
    );
  },
  [itemWidth, onProductPress]
);

  const keyExtractor = useCallback((item) => String(item.id), []);

  if (!products.length) {
return (
  <View
    style={styles.wrapper}
    onLayout={(e) => {
      console.log("GRID WIDTH:", e.nativeEvent.layout.width);
      setContainerWidth(e.nativeEvent.layout.width);
    }}
  >
        <Text style={styles.emptyText}>No products found</Text>
      </View>
    );
  }

  return (
  <View
    style={styles.wrapper}
    onLayout={(e) => {
      console.log("GRID WIDTH:", e.nativeEvent.layout.width);
      setContainerWidth(e.nativeEvent.layout.width);
    }}
  >
      {containerWidth > 0 && (
        <FlatList
          data={products}
          key={`${numColumns}-${containerWidth}`}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  row: {
    justifyContent: 'flex-start',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13.5,
    fontWeight: '500',
  },
});