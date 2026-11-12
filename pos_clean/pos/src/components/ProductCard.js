
import React, { useRef } from 'react';
import {
  Animated,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  COLORS as colors,
  RADIUS as radii,
  SHADOW as shadow,
} from "../components/Colors";

export default function ProductCard({
  product,
  onPress = () => {},
  onLongPress,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const handleLongPress = () => {
    console.log("🔥 PRODUCT LONG PRESS:", product);

    if (onLongPress) {
      onLongPress(product);
    }
  };

  const imageUri = product.image
    ? String(product.image).trim()
    : null;

  const productId = String(product._id || product.id || product.product);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={styles.card}
        onPressIn={() => animateTo(0.96)}
        onPressOut={() => animateTo(1)}
        onPress={() => {
          console.log("PRODUCT TAP:", product);
          onPress(product);
        }}
        onLongPress={handleLongPress}
        delayLongPress={400}
      >
        <View style={styles.imageWrap}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={productId}
              transition={150}
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

        <View style={styles.nameWrap}>
          <Text style={styles.name} numberOfLines={1}>
            {product.product || product.name}
          </Text>
        </View>

        <View style={styles.priceBar}>
          <Text style={styles.price}>
            ₹{Number(product.price || 0).toFixed(0)}
          </Text>
        </View>
      </Pressable>
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

  image: {
    width: '100%',
    height: '100%',
  },

  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nameWrap: {
    height: 35,
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
    height: 30,
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
