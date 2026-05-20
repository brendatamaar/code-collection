import type { Emitter, IR } from "@code-collection/core";

import { emitAuth } from "./auth.js";
import { groupEndpoints } from "./grouping.js";
import { emitInfo } from "./info.js";
import type { PostmanCollection } from "./types.js";
import { emitVariables } from "./variables.js";
import { writeCollection } from "./write.js";

export function emitCollection(ir: IR): PostmanCollection {
  const variable = emitVariables(ir);
  const auth = emitAuth(ir);

  return {
    info: emitInfo(ir),
    item: groupEndpoints(ir.endpoints, ir.schemas),
    ...(variable.length > 0 ? { variable } : {}),
    ...(auth ? { auth } : {})
  };
}

export const postmanEmitter: Emitter = {
  name: "postman",
  async emit(ir, options) {
    const collection = emitCollection(ir);
    const file = await writeCollection(collection, options.outputPath);

    return {
      files: [file],
      warnings: []
    };
  }
};

export * from "./auth.js";
export * from "./examples.js";
export * from "./grouping.js";
export * from "./info.js";
export * from "./path.js";
export * from "./request.js";
export * from "./types.js";
export * from "./variables.js";
export * from "./write.js";
