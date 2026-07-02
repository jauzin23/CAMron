import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "lib/**/*.tsx"],
      exclude: ["lib/translations/**"],
      thresholds: {
        lines: 75,
        functions: 68,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
