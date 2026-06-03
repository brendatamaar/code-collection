# code-collection

**Static API collection generator for backend repositories. No runtime required.**

[![npm version](https://img.shields.io/npm/v/@code-collection/cli)](https://www.npmjs.com/package/@code-collection/cli)
[![CI](https://github.com/brendatamaar/code-collection/actions/workflows/ci.yml/badge.svg)](https://github.com/brendatamaar/code-collection/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Point `code-collection` at a Spring Boot, Laravel, Go, or Node.js repository and it emits a ready-to-import Postman collection, Bruno collection, or Insomnia export — without running the application, without OpenAPI, and without manual configuration.

---

## Quick start

```bash
# Install globally
npm install -g @code-collection/cli

# Scan the current repo and emit a Postman collection
code-collection extract

# Or point at a specific repo
code-collection extract ./my-service

# All three formats at once
code-collection extract . --format all --output ./api-collections/
```

Or download a standalone binary (no Node or Bun required):

```bash
# Linux
curl -L https://github.com/brendatamaar/code-collection/releases/latest/download/code-collection-linux-x64 -o code-collection
chmod +x code-collection
./code-collection extract .

# macOS (Apple Silicon)
curl -L https://github.com/brendatamaar/code-collection/releases/latest/download/code-collection-darwin-arm64 -o code-collection
chmod +x code-collection && ./code-collection extract .
```

---

## Supported stacks

| Stack | Detection | HTTP methods | Auth | DTOs / request bodies |
|-------|-----------|-------------|------|----------------------|
| Spring Boot | `pom.xml` + `spring-boot-starter` | `@GetMapping`, `@PostMapping`, … | Spring Security / JWT | `@RequestBody` + DTO class fields |
| Laravel | `composer.json` + `laravel/framework` | `Route::get`, `Route::post`, … | `auth:api` middleware | `FormRequest` rules |
| Go | `go.mod` + gorilla/mux, gin, chi | `mux.HandleFunc`, `r.GET`, … | middleware detection | basic inference |
| Node.js | `package.json` with Express, Fastify, Hono, … | `app.get`, `router.post`, … | middleware detection | TypeScript type annotations |

---

## Emitters

| Format | Output |
|--------|--------|
| `postman` | Postman Collection v2.1 JSON + optional environment files |
| `bruno` | Bruno collection directory with `.bru` files |
| `insomnia` | Insomnia v4 export JSON with environments |

---

## Usage

### `extract` command

```
code-collection extract <path> [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--format` | `postman` | `postman` \| `bruno` \| `insomnia` \| `all` |
| `--output` | `./api-collection.json` | Output file or directory |
| `--stack` | `auto` | Force a parser: `spring` \| `laravel` \| `go` \| `node` |
| `--base-url` | `{{baseUrl}}` | Base URL. Use `name=url` for named environments. Repeatable. |
| `--split-by-version` | off | Emit one collection per detected API version |
| `--profile` | `default` | Spring profile for `application-<profile>.properties` |
| `--dry-run` | off | List endpoints without writing files |
| `--stdout` | off | Write raw IR JSON to stdout (pipe into `jq`) |
| `--ci` | off | Machine-readable JSON-lines events on stderr |
| `--report` | off | Write JSON coverage report to a path |
| `--verbose` | off | Show per-file parsing details |

### `init` command

```bash
code-collection init
```

Interactively creates a `code-collection.config.ts` in the repository root. Use `--yes` to skip prompts and write defaults.

### Multi-environment collections

```bash
code-collection extract . \
  --base-url dev=http://localhost:8080 \
  --base-url staging=https://staging.api.example.com \
  --base-url prod=https://api.example.com
```

Emits one collection file + one environment file per named environment.

---

## Configuration file

Create `code-collection.config.ts` (or run `code-collection init`):

```ts
import { defineConfig } from "@code-collection/core";

export default defineConfig({
  stack: "auto",
  output: {
    formats: ["postman", "bruno"],
    directory: "./api-collections",
    splitByVersion: false
  },
  servers: [{ url: "https://api.example.com" }]
});
```

Config files support TypeScript, JavaScript, and JSON. CLI flags always take precedence.

---

## Example output

```
$ code-collection extract ./pln-billing-service

✔ Detected stack: Spring Boot (Java 17)
✔ Scanned src/main/java (142 files in 0.4s)
✔ Parsed 47 controllers, 89 endpoints
✔ Detected auth on 31 of 89 endpoints

Emitted ./pln-billing-service.postman_collection.json
89 requests across 12 folders

Done in 1.4s
```

---

## Documentation

Full docs at **[brendatamaar.github.io/code-collection](https://brendatamaar.github.io/code-collection)**:

- [Getting started](https://brendatamaar.github.io/code-collection/getting-started)
- [CLI reference](https://brendatamaar.github.io/code-collection/cli-reference)
- [Supported stacks](https://brendatamaar.github.io/code-collection/stacks/)
- [Troubleshooting](https://brendatamaar.github.io/code-collection/troubleshooting)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup and changeset workflow.

---

## License

[MIT](LICENSE)
