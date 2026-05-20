import { createHash } from "node:crypto";
import { dirname, extname, join, basename } from "node:path";

import { writeCollection } from "./write.js";

export interface PostmanEnvironment {
  id: string;
  name: string;
  values: {
    key: string;
    value: string;
    type: "default" | "secret";
    enabled: boolean;
  }[];
  _postman_variable_scope: "environment";
  _postman_exported_using: "code-collection";
}

export async function writeEnvironments(
  collectionName: string,
  collectionPath: string,
  environments: Record<string, { baseUrl: string }>
): Promise<{ path: string; bytes: number }[]> {
  const files: { path: string; bytes: number }[] = [];
  const directory = dirname(collectionPath);
  const extension = extname(collectionPath) || ".json";
  const stem = basename(collectionPath, extension);

  for (const [name, values] of Object.entries(environments).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const environment = emitEnvironment(collectionName, name, values.baseUrl);
    files.push(
      await writeCollection(
        environment,
        join(directory, `${stem}.${name}.postman_environment${extension}`)
      )
    );
  }

  return files;
}

export function emitEnvironment(
  collectionName: string,
  envName: string,
  baseUrl: string
): PostmanEnvironment {
  return {
    id: deterministicId(`${collectionName}:${envName}`),
    name: `${collectionName} ${envName}`,
    values: [
      {
        key: "baseUrl",
        value: baseUrl,
        type: "default",
        enabled: true
      },
      {
        key: "bearerToken",
        value: "",
        type: "secret",
        enabled: true
      }
    ],
    _postman_variable_scope: "environment",
    _postman_exported_using: "code-collection"
  };
}

function deterministicId(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}
