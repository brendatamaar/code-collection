import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@code-collection/core": new URL(
        "./packages/core/src/index.ts",
        import.meta.url
      ).pathname,
      "@code-collection/emitter": new URL(
        "./packages/emitter/src/index.ts",
        import.meta.url
      ).pathname,
      "@code-collection/cli": new URL(
        "./packages/cli/src/index.ts",
        import.meta.url
      ).pathname,
      "@code-collection/parser-spring": new URL(
        "./packages/parser-spring/src/index.ts",
        import.meta.url
      ).pathname,
      "@code-collection/parser-laravel": new URL(
        "./packages/parser-laravel/src/index.ts",
        import.meta.url
      ).pathname,
      "@code-collection/parser-go": new URL(
        "./packages/parser-go/src/index.ts",
        import.meta.url
      ).pathname,
      "@code-collection/parser-node": new URL(
        "./packages/parser-node/src/index.ts",
        import.meta.url
      ).pathname
    }
  },
  test: {
    include: ["packages/**/*.test.ts"],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage"
    }
  }
});
