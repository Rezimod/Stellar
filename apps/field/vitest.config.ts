import { defineConfig } from 'vitest/config';

// Host-runnable unit tests for pure-logic modules (no React Native / Expo
// imports), so they run in plain Node without the native runtime. Currently the
// prompt-injection defence (`lib/sanitize.ts`). On-device behaviour is covered
// by the Diagnostics smoke probes instead.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/sanitize.test.ts'],
  },
});
