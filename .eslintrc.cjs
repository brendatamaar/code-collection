const parserPackageZone = (packageName) => ({
  target: `./packages/${packageName}/**/*`,
  from: "./packages/*/src/**/*",
  except: ["./packages/core/src"]
});

module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  plugins: ["@typescript-eslint", "import"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist/", "node_modules/", "coverage/", "bun.lockb", "bun.lock"],
  rules: {
    "no-console": "error",
    "import/no-restricted-paths": [
      "error",
      {
        zones: [
          parserPackageZone("parser-spring"),
          parserPackageZone("parser-laravel"),
          parserPackageZone("parser-go"),
          parserPackageZone("parser-node"),
          {
            target: "./packages/emitter/**/*",
            from: "./packages/*/src/**/*",
            except: ["./packages/core/src"]
          },
          ...[
            "cli",
            "emitter",
            "parser-go",
            "parser-laravel",
            "parser-node",
            "parser-spring"
          ].map((packageName) => ({
            target: "./packages/core/**/*",
            from: `./packages/${packageName}/src/**/*`
          })),
          {
            target: "./packages/*/**/*",
            from: "./packages/*/src/internal/**/*"
          }
        ]
      }
    ]
  },
  overrides: [
    {
      files: ["*.cjs"],
      parser: "espree",
      rules: {
        "@typescript-eslint/no-var-requires": "off"
      }
    }
  ]
};
