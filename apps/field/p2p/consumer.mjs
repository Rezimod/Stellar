import { completion, LLAMA_3_2_1B_INST_Q4_0, loadModel, close } from '@qvac/sdk';
const topic = '66646f696865726f6569686a726530776a66646f696865726f6569686a726530';
const pk = process.argv[2];
const t0 = Date.now();
try {
  console.log('→ delegated loadModel…');
  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    modelType: 'llm',
    delegate: { topic, providerPublicKey: pk, timeout: 60000, fallbackToLocal: false },
  });
  console.log('✓ model registered:', modelId, '(' + (Date.now()-t0) + 'ms)');
  console.log('→ delegated completion…');
  const res = completion({ modelId, history: [{ role: 'user', content: 'Say hello in exactly 5 words.' }], stream: true });
  let out = '';
  for await (const tok of res.tokenStream) { out += tok; process.stdout.write(tok); }
  console.log('\n✓ RESPONSE_OK:', JSON.stringify(out));
  console.log('STATS:', JSON.stringify(await res.stats));
  await close();
  process.exit(0);
} catch (e) {
  console.error('CONSERR:', e?.message ?? e);
  process.exit(1);
}
