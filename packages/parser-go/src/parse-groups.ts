export function extractGroupPrefixes(content: string): Map<string, string> {
  const prefixes = new Map<string, string>();

  for (const match of content.matchAll(
    /(\w+)\s*:=\s*(\w+)\.Group\s*\(\s*"([^"]*)"\s*\)/g
  )) {
    const variable = match[1];
    const parent = match[2];
    const prefix = match[3];
    if (!variable || !prefix) {
      continue;
    }
    prefixes.set(variable, joinPaths(prefixes.get(parent ?? "") ?? "", prefix));
  }

  return prefixes;
}

export function joinPaths(...parts: string[]): string {
  const joined = parts
    .filter(Boolean)
    .join("/")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");
  const withLeading = joined.startsWith("/") ? joined : `/${joined}`;
  return withLeading.length > 1 ? withLeading.replace(/\/+$/g, "") : withLeading;
}
