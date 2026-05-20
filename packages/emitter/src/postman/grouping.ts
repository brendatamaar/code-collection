import type { Endpoint, Tag } from "@code-collection/core";

import { emitRequest, type PostmanRequestItem } from "./request.js";
import type { Schema } from "@code-collection/core";

const METHOD_ORDER = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE"];

export interface PostmanFolder {
  name: string;
  item: PostmanRequestItem[];
  description?: string;
}

export function groupEndpoints(
  endpoints: Endpoint[],
  schemas: Record<string, Schema> = {},
  tags: Tag[] = []
): PostmanFolder[] {
  const groups = new Map<string, Endpoint[]>();
  const tagDescriptions = new Map(tags.map((tag) => [tag.name, tag.description]));

  for (const endpoint of endpoints) {
    const groupName = endpoint.tags[0] ?? firstPathSegment(endpoint.path);
    groups.set(groupName, [...(groups.get(groupName) ?? []), endpoint]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, groupedEndpoints]) => ({
      name,
      description:
        tagDescriptions.get(name) ??
        `Requests grouped from ${name} endpoints.`,
      item: groupedEndpoints
        .sort(compareEndpoints)
        .map((endpoint) => emitRequest(endpoint, schemas))
    }));
}

function firstPathSegment(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? "root";
}

function compareEndpoints(left: Endpoint, right: Endpoint): number {
  const methodDiff =
    METHOD_ORDER.indexOf(left.method) - METHOD_ORDER.indexOf(right.method);
  if (methodDiff !== 0) {
    return methodDiff;
  }

  return left.path.localeCompare(right.path);
}
