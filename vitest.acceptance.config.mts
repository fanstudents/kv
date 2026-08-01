import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/acceptance/openai-provider.acceptance.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 10_000,
    testTimeout: 180_000,
  },
});
