import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/index.ts', 'src/**/*.test.{ts,tsx}'],
    },
  },
});
