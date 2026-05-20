import type { Emitter, IR } from "@code-collection/core";

import { emitAuth } from "./auth.js";
import { writeEnvironments } from "./environment.js";
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
    item: groupEndpoints(ir.endpoints, ir.schemas, ir.tags),
    ...(variable.length > 0 ? { variable } : {}),
    ...(auth ? { auth } : {})
  };
}

export const postmanEmitter: Emitter = {
  name: "postman",
  async emit(ir, options) {
    const collection = emitCollection(ir);
    const file = await writeCollection(collection, options.outputPath);
    const environmentFiles = options.environments
      ? await writeEnvironments(collection.info.name, options.outputPath, options.environments)
      : [];

    return {
      files: [file, ...environmentFiles],
      warnings: []
    };
  }
};

export * from "./auth.js";
export * from "./environment.js";
export * from "./examples.js";
export * from "./grouping.js";
export * from "./info.js";
export * from "./path.js";
export * from "./response.js";
export * from "./request.js";
export * from "./types.js";
export * from "./variables.js";
export * from "./write.js";
