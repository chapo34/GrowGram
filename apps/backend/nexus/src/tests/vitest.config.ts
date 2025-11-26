import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // wir laufen in Node
    environment: 'node',
    globals: true,

    // WICHTIG: dieses Pattern passt zu --dir (z.B. src/tests/e2e)
    include: ['**/*.{test,spec}.ts'],

    // übliche Ausschlüsse
    exclude: ['**/node_modules/**', '**/dist/**'],

    // setzt Dev-ENVs / Emulator-Hosts etc.
    setupFiles: ['src/tests/setup/env.ts'],

    // optional: schnellere Ausführung
    pool: 'threads',
  },
});