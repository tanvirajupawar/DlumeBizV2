import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

const LoadingView = ({ message = 'Loading categories...' }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#2563EB" />
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 60,
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

export default LoadingView;