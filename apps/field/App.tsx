import 'react-native-get-random-values';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StellarPrivyProvider } from './lib/privy';
import { FieldChatScreen } from './components/FieldChatScreen';
import { VoiceLogScreen } from './components/VoiceLogScreen';
import { DiagnosticsScreen } from './components/DiagnosticsScreen';

type Tab = 'chat' | 'voice' | 'diag';

export default function App() {
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <SafeAreaProvider>
      <StellarPrivyProvider>
        <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
          <StatusBar style="light" />
          <View style={styles.screen}>
            {tab === 'chat' ? <FieldChatScreen /> : tab === 'voice' ? <VoiceLogScreen /> : <DiagnosticsScreen />}
          </View>
          <View style={styles.tabBar}>
            <TabButton label="Companion" active={tab === 'chat'} onPress={() => setTab('chat')} />
            <TabButton label="Voice Log" active={tab === 'voice'} onPress={() => setTab('voice')} />
            <TabButton label="Diagnostics" active={tab === 'diag'} onPress={() => setTab('diag')} />
          </View>
        </SafeAreaView>
      </StellarPrivyProvider>
    </SafeAreaProvider>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
    >
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0E17' },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0B0E17',
    borderTopWidth: 1,
    borderTopColor: '#1A1F2E',
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 8,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#1A1F2E',
  },
  tabBtnText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  tabBtnTextActive: { color: '#E5E7EB' },
});
