import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Run test files serially to avoid races on the shared `household-tracker-test`
    // MongoDB DB (seed.test.ts and api-*.test.ts both dropDatabase() in beforeEach).
    // 18 tests is small enough that single-threaded execution is still fast (<2s).
    fileParallelism: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.')
    }
  }
});