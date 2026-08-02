import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(new URL("./tests/mocks/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 10_000,
    testTimeout: 20_000,
  },
});
