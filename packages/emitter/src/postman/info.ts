import { createHash } from "node:crypto";

import type { IR } from "@code-collection/core";

import type { PostmanInfo } from "./types.js";

const POSTMAN_SCHEMA =
  "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

export function emitInfo(ir: IR): PostmanInfo {
  const versionSuffix = ir.info.version ? `\n\nVersion: ${ir.info.version}` : "";
  const description = [ir.info.description, versionSuffix.trim()]
    .filter(Boolean)
    .join("\n\n");

  return {
    name: ir.info.title,
    schema: POSTMAN_SCHEMA,
    _postman_id: sha1(`${ir.info.title}${ir.info.version ?? ""}`),
    ...(description ? { description } : {})
  };
}

function sha1(value: string): string {
  return createHash("sha1").update(value).digest("hex");
}
