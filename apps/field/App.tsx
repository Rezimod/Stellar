import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StellarPrivyProvider } from './lib/privy';
import { FieldChatScreen } from './components/FieldChatScreen';

export default function App() {
  return (
    <StellarPrivyProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <FieldChatScreen />
      </SafeAreaView>
    </StellarPrivyProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0E17' },
});
