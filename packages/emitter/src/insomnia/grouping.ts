import type { AuthScheme, Endpoint, Schema, Tag } from "@code-collection/core";

import { emitRequest } from "./request.js";
import { deterministicId } from "./info.js";
import type { InsomniaRequest, InsomniaRequestGroup } from "./types.js";

const METHOD_ORDER = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE"];

export interface InsomniaGroup {
  group: InsomniaRequestGroup;
  requests: InsomniaRequest[];
}

export function groupEndpoints(
  workspaceId: string,
  collectionTitle: string,
  endpoints: Endpoint[],
  schemas: Record<string, Schema>,
  authSchemes: AuthScheme[],
  tags: Tag[]
): InsomniaGroup[] {
  const groups = new Map<string, Endpoint[]>();
  const tagDescriptions = new Map(tags.map((tag) => [tag.name, tag.description]));

  for (const endpoint of endpoints) {
    const groupName = endpoint.tags[0] ?? firstPathSegment(endpoint.path);
    groups.set(groupName, [...(groups.get(groupName) ?? []), endpoint]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, groupEndpoints], groupIndex) => {
      const groupId = `fld_${deterministicId(collectionTitle + ":group:" + name)}`;
      const sorted = [...groupEndpoints].sort(compareEndpoints);

      return {
        group: {
          _id: groupId,
          _type: "request_group" as const,
          parentId: workspaceId,
          modified: 0 as const,
          created: 0 as const,
          name,
          description:
            tagDescriptions.get(name) ??
            `Requests grouped from ${name} endpoints.`,
          environment: {},
          environmentPropertyOrder: null,
          metaSortKey: -(groupIndex + 1) * 1_000_000
        },
        requests: sorted.map((endpoint, requestIndex) =>
          emitRequest(groupId, endpoint, schemas, authSchemes, requestIndex)
        )
      };
    });
}

function firstPathSegment(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? "root";
}

function compareEndpoints(a: Endpoint, b: Endpoint): number {
  const methodDiff =
    METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method);
  if (methodDiff !== 0) {
    return methodDiff;
  }

  return a.path.localeCompare(b.path);
}
