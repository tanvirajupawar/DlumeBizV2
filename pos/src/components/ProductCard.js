
import React, { useRef } from 'react';
import { Animated, View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  COLORS as colors,
  RADIUS as radii,
  SPACING as spacing,
} from "../components/Colors";
import { typography } from '../styles/typography';


export default function ProductCard({ product, onPress = () => {} }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };
console.log(
  product.name,
  product.image
);

return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPressIn={() => animateTo(0.96)}
        onPressOut={() => animateTo(1)}
        onPress={() => onPress(product)}
      >
        {/* Image — fills top ~65% of card */}
        <View style={styles.imageWrap}>
       {product.image ? (
<Image
  source={{ uri: product.image }}
  style={styles.image}
  resizeMode="cover"
  onLoad={() => console.log("✅ Loaded:", product.name)}
  onError={(e) => console.log("❌ Error:", e.nativeEvent)}
/>
) : (
            <View style={styles.imageFallback}>
            <MaterialCommunityIcons
  name="image-outline"
  size={42}
  color="#94A3B8"
/>
            </View>
          )}
        </View>

        {/* Name */}
        <View style={styles.nameWrap}>
          <Text style={styles.name} numberOfLines={1}>
            {product.name}
          </Text>
        </View>

        {/* Price bar — pinned to bottom, full width */}
        <View style={styles.priceBar}>
          <Text style={styles.price}>
            {'\u20B9'}{Number(product.price).toFixed(0)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
card: {
  backgroundColor: colors.white,
  borderRadius: radii.md,
  overflow: 'hidden',
  height: 190,
  ...shadow.card,
},

imageWrap: {
  width: '100%',
  height: 125,
  backgroundColor: colors.background,
},

nameWrap: {
  height: 35,              // Fixed height
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 6,
},

name: {
  fontSize: 16,
  fontWeight: '500',
  color: colors.textPrimary,
  textAlign: 'center',
},

priceBar: {
  height: 30,              // Fixed height
  width: '100%',
  backgroundColor: '#A7B5D4',
  justifyContent: 'center',
  alignItems: 'center',
},

price: {
  fontSize: 18,
  fontWeight: '700',
  color: '#FFFFFF',
},
});
