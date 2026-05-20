import { dictionaryBlock, serializeBru } from "./bru-syntax.js";

export function emitEnvironmentBru(baseUrl: string): string {
  return serializeBru([
    dictionaryBlock("vars", {
      baseUrl,
      bearerToken: ""
    }),
    dictionaryBlock("vars:secret", {
      bearerToken: ""
    })
  ]);
}
