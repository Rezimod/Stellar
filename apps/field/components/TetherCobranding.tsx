import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/** Minimal "Powered by Tether QVAC" attribution. */
export function TetherCobranding() {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.powered}>Powered by Tether QVAC</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1A1F2E',
  },
  powered: {
    color: '#6B7280',
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
