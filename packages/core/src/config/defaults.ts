import type { ResolvedOptions } from "./types.js";

export const DEFAULT_EXCLUDE_GLOBS = [
  "**/node_modules/**",
  "**/vendor/**",
  "**/target/**",
  "**/build/**",
  "**/dist/**",
  "**/out/**",
  "**/.git/**",
  "**/.idea/**",
  "**/.vscode/**",
  "**/test/**",
  "**/tests/**",
  "**/*_test.go",
  "**/*.spec.ts",
  "**/*.test.ts"
] as const;

export const DEFAULT_OPTIONS: ResolvedOptions = {
  repoPath: ".",
  stack: "auto",
  include: [],
  exclude: [...DEFAULT_EXCLUDE_GLOBS],
  output: {
    formats: ["postman"],
    file: "./api-collection.json",
    directory: "./api-collections",
    splitByVersion: false
  },
  servers: [{ url: "{{baseUrl}}" }],
  environments: {},
  parser: {
    spring: {
      propertyFiles: ["src/main/resources/application.yml"],
      profile: "default"
    },
    laravel: {
      routeFiles: ["routes/web.php", "routes/api.php"],
      includeFormRequests: true
    },
    go: {
      modules: []
    },
    node: {
      tsConfig: "./tsconfig.json"
    }
  },
  authDetection: true,
  reportPath: null,
  warnings: {
    suppress: [],
    failOn: []
  },
  verbose: false,
  quiet: false,
  noColor: false,
  ci: false,
  dryRun: false,
  stdout: false,
  noWarnings: false,
  config: null
};
