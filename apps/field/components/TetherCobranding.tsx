import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { TETHER_COBRAND } from '../lib/tetherBrand';

/** Header co-brand row for Stellar Field × Tether QVAC. */
export function TetherCobranding() {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <View style={styles.winnerBadge}>
        <Text style={styles.winnerText}>{TETHER_COBRAND.winnerBadge}</Text>
      </View>
      <Text style={styles.powered}>{TETHER_COBRAND.poweredBy}</Text>
      <Text style={styles.track}>{TETHER_COBRAND.trackDetail}</Text>
    </View>
  );
}

const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1A1F2E',
    gap: 4,
  },
  winnerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#14B8A618',
    borderWidth: 1,
    borderColor: '#14B8A655',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  winnerText: {
    color: '#14B8A6',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    fontFamily: mono,
    textTransform: 'uppercase',
  },
  powered: {
    color: '#9CA3AF',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  track: {
    color: '#6B7280',
    fontSize: 9,
    letterSpacing: 0.8,
    fontFamily: mono,
    textTransform: 'uppercase',
  },
});
