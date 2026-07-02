import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // "server-only" throws outside a React Server Components bundler;
      // stub it so server modules can be unit-tested in node.
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".claude"],
  },
});
