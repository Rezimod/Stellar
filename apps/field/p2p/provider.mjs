import { startQVACProvider, loadModel, LLAMA_3_2_1B_INST_Q4_0 } from '@qvac/sdk';
const topic = '66646f696865726f6569686a726530776a66646f696865726f6569686a726530';
try {
  console.log('PREWARM: downloading/caching model on provider…');
  await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0, modelType: 'llm',
    onProgress: p => { if (p?.percentage!=null && Math.round(p.percentage)%20===0) console.log('  prewarm', p.percentage.toFixed(0)+'%'); } });
  console.log('PREWARM_DONE');
  const r = await startQVACProvider({ topic });
  console.log('PUBKEY:' + r.publicKey);
  process.stdin.resume();
} catch (e) {
  console.error('PROVERR:', e?.message ?? e);
  process.exit(1);
}
