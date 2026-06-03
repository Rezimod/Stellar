import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  BackHandler,
  Pressable,
} from 'react-native';
import type { Conversation } from '../lib/conversations';
import { relativeTime } from '../lib/conversations';
import type { Observer } from '../lib/location';

const SCREEN_W = Dimensions.get('window').width;
const PANEL_W = Math.min(320, Math.round(SCREEN_W * 0.84));

type Props = {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  observer: Observer;
};

export function ChatDrawer({
  open,
  onClose,
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  observer,
}: Props) {
  const slide = useRef(new Animated.Value(open ? 0 : -PANEL_W)).current;
  const fade = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: open ? 0 : -PANEL_W,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: open ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, slide, fade]);

  // Android hardware back closes the drawer first.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  if (!open) return null;

  const locLabel = `${observer.lat.toFixed(2)}°, ${observer.lon.toFixed(2)}° · ${
    observer.source === 'gps' ? 'GPS' : 'default'
  }`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateX: slide }] }]}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>Stellar Field</Text>
          <Text style={styles.brandSub}>On-device sky companion</Text>
        </View>

        <TouchableOpacity style={styles.newChat} onPress={onNewChat} activeOpacity={0.85}>
          <Text style={styles.newChatPlus}>＋</Text>
          <Text style={styles.newChatText}>New chat</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>History</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {conversations.length === 0 ? (
            <Text style={styles.empty}>No saved chats yet.</Text>
          ) : (
            conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <View key={c.id} style={[styles.row, active && styles.rowActive]}>
                  <TouchableOpacity style={styles.rowMain} onPress={() => onSelect(c.id)} activeOpacity={0.7}>
                    <Text style={[styles.rowTitle, active && styles.rowTitleActive]} numberOfLines={1}>
                      {c.title}
                    </Text>
                    <Text style={styles.rowTime}>{relativeTime(c.updatedAt)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.del}
                    onPress={() => onDelete(c.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.delText}>×</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.settingRow}>
            <Text style={styles.settingKey}>Location</Text>
            <Text style={styles.settingVal} numberOfLines={1}>{locLabel}</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingKey}>Mode</Text>
            <Text style={styles.settingVal}>Offline · on-device</Text>
          </View>
          <Text style={styles.footerNote}>Powered by Tether QVAC</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,6,12,0.6)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: PANEL_W,
    backgroundColor: '#0C101B',
    borderRightWidth: 1,
    borderRightColor: '#1C2333',
    paddingTop: 14,
  },
  brandRow: { paddingHorizontal: 16, paddingBottom: 14 },
  brand: { color: '#F3F4F6', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  brandSub: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  newChat: {
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#15203A',
    borderWidth: 1,
    borderColor: '#2A3A5E',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  newChatPlus: { color: '#7DD3C4', fontSize: 16, fontWeight: '700', marginTop: -1 },
  newChatText: { color: '#E5E7EB', fontSize: 14, fontWeight: '600' },
  sectionLabel: {
    color: '#6B7280',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: mono,
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 6,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 8, paddingBottom: 12 },
  empty: { color: '#4B5563', fontSize: 13, paddingHorizontal: 8, paddingVertical: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingLeft: 10,
    paddingRight: 4,
  },
  rowActive: { backgroundColor: '#141B2A' },
  rowMain: { flex: 1, paddingVertical: 9 },
  rowTitle: { color: '#C7CBD3', fontSize: 14 },
  rowTitleActive: { color: '#F3F4F6', fontWeight: '600' },
  rowTime: { color: '#5B6472', fontSize: 11, marginTop: 2 },
  del: { paddingHorizontal: 8, paddingVertical: 6 },
  delText: { color: '#4B5563', fontSize: 18, lineHeight: 18 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1A2030',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 7,
  },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  settingKey: { color: '#6B7280', fontSize: 12 },
  settingVal: { color: '#9CA3AF', fontSize: 12, flexShrink: 1, textAlign: 'right' },
  footerNote: { color: '#4B5563', fontSize: 10, letterSpacing: 0.3, marginTop: 4 },
});
