import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { LoadProgress } from '../lib/qvac';

function formatBytes(b?: number) {
  if (!b) return '';
  if (b > 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (b > 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(0)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}

export function ModelLoadingBanner({ progress }: { progress: LoadProgress }) {
  if (progress.phase === 'ready') return null;

  const pct =
    progress.bytesDownloaded && progress.bytesTotal
      ? Math.round((progress.bytesDownloaded / progress.bytesTotal) * 100)
      : null;

  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        {progress.phase !== 'error' && <ActivityIndicator color="#8B5CF6" />}
        <Text style={styles.label}>
          {progress.phase === 'error'
            ? 'Local AI failed to load'
            : progress.message ?? 'Preparing on-device AI'}
        </Text>
      </View>
      {pct != null && (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
      )}
      {progress.bytesDownloaded != null && progress.bytesTotal != null && (
        <Text style={styles.detail}>
          {formatBytes(progress.bytesDownloaded)} / {formatBytes(progress.bytesTotal)}
        </Text>
      )}
      {progress.error && <Text style={styles.error}>{progress.error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#1A1F2E',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: '#E5E7EB', fontSize: 14 },
  barTrack: { height: 4, backgroundColor: '#0B0E17', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: '#8B5CF6' },
  detail: { color: '#9CA3AF', fontSize: 12, fontVariant: ['tabular-nums'] },
  error: { color: '#F59E0B', fontSize: 12 },
});
