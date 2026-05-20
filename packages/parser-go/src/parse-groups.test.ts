import { describe, expect, it } from "vitest";

import { extractGroupPrefixes, joinPaths } from "./parse-groups.js";

describe("joinPaths", () => {
  it.each([
    ["/v1", "/users", "/v1/users"],
    ["/v1/", "users", "/v1/users"],
    ["", "/users", "/users"],
    ["/v1", "", "/v1"],
    ["/v1", "/", "/v1"]
  ])("normalizes '%s' + '%s' → '%s'", (a, b, expected) => {
    expect(joinPaths(a, b)).toBe(expected);
  });
});

describe("extractGroupPrefixes (Gin)", () => {
  it("extracts a single Gin Group assignment", () => {
    const content = `
func main() {
  r := gin.Default()
  v1 := r.Group("/v1")
  v1.GET("/users", listUsers)
}
`;
    const groups = extractGroupPrefixes(content);
    expect(groups.get("v1")).toBe("/v1");
  });

  it("composes nested Gin groups", () => {
    const content = `
func setup(r *gin.Engine) {
  api := r.Group("/api")
  v1 := api.Group("/v1")
  v1.GET("/users", listUsers)
}
`;
    const groups = extractGroupPrefixes(content);
    expect(groups.get("api")).toBe("/api");
    expect(groups.get("v1")).toBe("/api/v1");
  });
});

describe("extractGroupPrefixes (Echo)", () => {
  it("extracts an Echo Group assignment", () => {
    const content = `
func main() {
  e := echo.New()
  g := e.Group("/api")
  g.GET("/items", listItems)
}
`;
    const groups = extractGroupPrefixes(content);
    expect(groups.get("g")).toBe("/api");
  });

  it("composes nested Echo groups", () => {
    const content = `
func main() {
  e := echo.New()
  api := e.Group("/api")
  v2 := api.Group("/v2")
}
`;
    const groups = extractGroupPrefixes(content);
    expect(groups.get("v2")).toBe("/api/v2");
  });
});
