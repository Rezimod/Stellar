import { expect, it } from 'vitest';
import { shouldRetryMint } from '@/lib/mint-retry';

it.each([
  'Mint timeout after 25000ms',
  'Transaction was not confirmed in 30.00 seconds. It is unknown if it succeeded or failed.',
  'request timed out',
])('never retries when the first transaction may still land: %s', (message) => {
  expect(shouldRetryMint(new Error(message))).toBe(false);
});

it.each([
  'Signature abc has expired: block height exceeded.',
  'Simulation failed: Blockhash not found',
  'fetch failed',
  'failed to get recent blockhash: FetchError',
])('retries when the first transaction provably never executed: %s', (message) => {
  expect(shouldRetryMint(new Error(message))).toBe(true);
});

it('treats non-Error throws by their text', () => {
  expect(shouldRetryMint('Mint timeout after 25000ms')).toBe(false);
  expect(shouldRetryMint(undefined)).toBe(true);
});
