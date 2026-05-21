import { createHash } from "node:crypto";

import type { IR } from "@code-collection/core";

import type { InsomniaWorkspace } from "./types.js";

export function deterministicId(seed: string): string {
  return createHash("sha1").update(seed).digest("hex").slice(0, 16);
}

export function emitWorkspace(ir: IR): InsomniaWorkspace {
  return {
    _id: `wrk_${deterministicId(ir.info.title)}`,
    _type: "workspace",
    parentId: null,
    modified: 0,
    created: 0,
    name: ir.info.title,
    description: ir.info.description ?? "",
    scope: "collection"
  };
}
