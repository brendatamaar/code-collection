import type { Tag } from "@code-collection/core";

import { dictionaryBlock, serializeBru, textBlock } from "./bru-syntax.js";

export function folderMeta(name: string, tags: Tag[]): string {
  const description =
    tags.find((tag) => tag.name === name)?.description ??
    `Requests grouped from ${name} endpoints.`;
  return serializeBru([
    dictionaryBlock("meta", {
      name,
      type: "folder"
    }),
    textBlock("docs", description)
  ]);
}
