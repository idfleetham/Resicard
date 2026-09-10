import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["server/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
      // So pure, non-rendering client modules (the card palette, for one) can be
      // covered by the ordinary test run rather than only by looking at them.
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
});
