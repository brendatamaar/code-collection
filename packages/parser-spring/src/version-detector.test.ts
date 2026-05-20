import { describe, expect, it } from "vitest";

import { detectVersion } from "./version-detector.js";

describe("detectVersion", () => {
  it.each([
    ["/api/v1/users", "v1"],
    ["/v2/orders/{id}", "v2"],
    ["/api/v10/health", "v10"],
    ["/V3/items", "v3"]
  ])("extracts version from '%s'", (path, expected) => {
    expect(detectVersion(path)).toBe(expected);
  });

  it("returns first version match when multiple segments present", () => {
    expect(detectVersion("/api/v1/profile/v2/settings")).toBe("v1");
  });

  it("returns undefined when no version segment present", () => {
    expect(detectVersion("/users")).toBeUndefined();
    expect(detectVersion("/api/users/{id}")).toBeUndefined();
  });

  it("returns undefined for empty path", () => {
    expect(detectVersion("")).toBeUndefined();
  });
});
