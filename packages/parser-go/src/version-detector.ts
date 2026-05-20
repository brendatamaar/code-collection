export function detectVersion(path: string): string | undefined {
  return /\/(v\d+)(?:\/|$)/i.exec(path)?.[1]?.toLowerCase();
}
