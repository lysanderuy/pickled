import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    // env.ts validates the whole schema on first access — dummy values so tests
    // can exercise optional-var paths (e.g. rate-limit.ts) without real credentials.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
  },
});
