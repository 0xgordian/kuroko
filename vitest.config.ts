import { defineConfig } from 'vitest/config';
import path from 'path';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['lib/services/__tests__/*.test.ts', 'app/api/**/*.test.ts'],
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});