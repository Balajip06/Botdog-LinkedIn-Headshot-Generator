import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Integration test runner — drives a real local Postgres (via
 * `pnpm supabase:start`) and exercises every trigger / RLS / constraint
 * the unit suite mocks away.
 *
 * Run with `pnpm test:integration` after the Supabase stack is up.
 * Excluded from `pnpm test` by living under `tests/integration/` (the
 * default unit config excludes that folder via the workspace exclude).
 *
 * Each spec opens its own postgres client + truncates the surface it
 * touches, so order independence holds and the suite can be parallelized
 * later. Default to `fileParallelism: false` for now — pgcrypto +
 * trigger logs make true concurrency noisy until we shard the schema.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/integration/setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
