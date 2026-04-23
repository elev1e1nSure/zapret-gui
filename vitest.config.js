import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Utility/config tests run in a lightweight Node environment.
    // Hook integration tests override this per-file with `@vitest-environment jsdom`.
    environment: "node",
    include: [
      "src/**/__tests__/**/*.test.{js,jsx}",
      "src/**/*.test.{js,jsx}",
    ],
    coverage: {
      provider: "v8",
      include: ["src/utils/**", "src/hooks/**", "src/config.js"],
    },
  },
});
