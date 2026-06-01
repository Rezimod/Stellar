import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { runSmokeTest } from '../lib/smoke';
import { runSkyAgent } from '../lib/agent';
import { audit } from '../lib/audit';

// Default observer = Tbilisi (Astroman's home). The agent answers for this spot.
const LAT = 41.7151;
const LON = 44.8271;

/**
 * On-device validation surface for the QVAC hackathon. One tap each:
 *  - Smoke test: which QVAC capabilities actually run on this phone
 *  - Ask agent: the offline tool-calling loop (ephemeris) end-to-end
 *  - Export audit log: the evidence bundle (TTFT/tokens-sec + hardware)
 */
export function DiagnosticsScreen() {
  const [lines, setLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const log = (s: string) => setLines((prev) => [...prev, s]);
  const clear = () => setLines([]);

  async function onSmoke() {
    if (busy) return;
    setBusy(true);
    clear();
    log('▶ Running capability smoke test… (downloads models on first run)');
    try {
      await runSmokeTest((r) =>
        log(`${r.ok ? '✅' : '❌'} ${r.capability}  (${r.ms}ms)  ${r.detail}`),
      );
      log('— smoke test done —');
    } catch (e: any) {
      log(`✖ smoke crashed: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onAgent() {
    if (busy) return;
    setBusy(true);
    clear();
    const q = 'Is Saturn visible right now, and what can I see tonight?';
    log(`▶ Agent: "${q}"`);
    log(`(observer: Tbilisi ${LAT}, ${LON})`);
    try {
      const { stream, toolsUsed } = await runSkyAgent(q, [], LAT, LON);
      log(`🛠 tools called: ${toolsUsed.length ? toolsUsed.join(', ') : '(none — answered directly)'}`);
      log('💬 …'); // placeholder; replaced as tokens stream in
      let acc = '';
      for await (const tok of stream) {
        acc += tok;
        setLines((prev) => [...prev.slice(0, -1), `💬 ${acc}`]);
      }
      log('— agent done —');
    } catch (e: any) {
      log(`✖ agent error: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    const device = await audit.deviceInfo();
    const payload = { device, ...audit.toJSON() };
    const json = JSON.stringify(payload, null, 2);
    await Clipboard.setStringAsync(json);
    log(`📋 Audit log copied to clipboard — ${audit.getEvents().length} events, device: ${device.modelName ?? 'unknown'}`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Diagnostics</Text>
        <Text style={styles.sub}>QVAC on-device validation</Text>
      </View>

      <View style={styles.actions}>
        <Btn label="Run smoke test" onPress={onSmoke} disabled={busy} />
        <Btn label="Ask agent" onPress={onAgent} disabled={busy} />
        <Btn label="Export audit log" onPress={onExport} disabled={busy} subtle />
      </View>

      <ScrollView style={styles.console} contentContainerStyle={styles.consoleContent}>
        {lines.length === 0 ? (
          <Text style={styles.placeholder}>Tap a button to begin. First run downloads models (~700MB LLM).</Text>
        ) : (
          lines.map((l, i) => (
            <Text key={i} style={styles.line}>{l}</Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Btn({ label, onPress, disabled, subtle }: { label: string; onPress: () => void; disabled?: boolean; subtle?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, subtle && styles.btnSubtle, disabled && styles.btnDisabled]}
    >
      <Text style={[styles.btnText, subtle && styles.btnTextSubtle]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E17' },
  header: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1A1F2E' },
  title: { color: '#E5E7EB', fontSize: 20, fontWeight: '600', letterSpacing: 0.3 },
  sub: { color: '#6B7280', fontSize: 10, letterSpacing: 1.2, marginTop: 4, fontFamily: 'monospace' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  btn: { backgroundColor: '#14B8A6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnSubtle: { backgroundColor: '#1A1F2E', borderWidth: 1, borderColor: '#252B3D' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#0B0E17', fontWeight: '700', fontSize: 13 },
  btnTextSubtle: { color: '#E5E7EB' },
  console: { flex: 1, margin: 12, marginTop: 0, backgroundColor: '#070A12', borderRadius: 10, borderWidth: 1, borderColor: '#1A1F2E' },
  consoleContent: { padding: 12, gap: 6 },
  placeholder: { color: '#6B7280', fontSize: 13, lineHeight: 19 },
  line: { color: '#C7D0E0', fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },
});
