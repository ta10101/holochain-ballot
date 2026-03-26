import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Holochain conductors + DHT: one file at a time avoids flaky dhtSync under load.
    fileParallelism: false,
  },
});
