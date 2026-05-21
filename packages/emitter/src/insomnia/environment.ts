import type { EmitOptions, IR } from "@code-collection/core";

import { baseEnvironmentAuthVars } from "./auth.js";
import { deterministicId } from "./info.js";
import type { InsomniaEnvironment } from "./types.js";

export function emitBaseEnvironment(
  workspaceId: string,
  ir: IR,
  options: EmitOptions
): InsomniaEnvironment {
  const baseUrl =
    options.baseUrl ?? ir.servers[0]?.url ?? "https://api.example.com";

  return {
    _id: `env_${deterministicId(ir.info.title + ":base")}`,
    _type: "environment",
    parentId: workspaceId,
    modified: 0,
    created: 0,
    name: "Base Environment",
    data: {
      baseUrl,
      ...baseEnvironmentAuthVars(ir.auth)
    },
    dataPropertyOrder: null,
    color: null,
    isPrivate: false,
    metaSortKey: 1
  };
}

export function emitNamedEnvironment(
  baseEnvId: string,
  collectionTitle: string,
  envName: string,
  baseUrl: string,
  sortIndex: number
): InsomniaEnvironment {
  return {
    _id: `env_${deterministicId(collectionTitle + ":" + envName)}`,
    _type: "environment",
    parentId: baseEnvId,
    modified: 0,
    created: 0,
    name: envName,
    data: { baseUrl },
    dataPropertyOrder: null,
    color: null,
    isPrivate: false,
    metaSortKey: sortIndex
  };
}
