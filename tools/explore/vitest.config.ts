import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const here = (p: string) => path.resolve(__dirname, p);
const src = (p: string) => path.resolve(__dirname, '../../src', p);

export default defineConfig({
  plugins: [react()],
  test: {
    root: here('.'),
    environment: 'jsdom',
    globals: true,
    setupFiles: [src('test/setup.ts')],
    include: ['test/**/*.test.ts'],
    testTimeout: 20_000,
  },
  resolve: {
    alias: [
      { find: '@/lib/solar-system/ephemeris', replacement: src('lib/solar-system/ephemeris') },
      { find: '@/lib/solar-system/planet-palettes', replacement: src('lib/solar-system/planet-palettes') },
      { find: '@/lib/solar-system', replacement: here('lib/solar-system') },
      { find: '@/components/solar-system', replacement: here('components/solar-system') },
      { find: '@/lib/multiplayer', replacement: here('lib/multiplayer') },
      { find: '@', replacement: src('.') },
    ],
  },
});
