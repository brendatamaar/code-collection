import { WarningCode } from "@code-collection/core";
import { describe, expect, it } from "vitest";

import { resolvePath } from "./path-resolver.js";

describe("resolvePath", () => {
  it.each([
    ["/api", "/users", "/api/users"],
    ["/api/", "/users", "/api/users"],
    ["/api", "users", "/api/users"],
    ["api", "users", "/api/users"],
    ["", "/users", "/users"],
    ["/api", "", "/api"],
    [undefined, undefined, "/"],
    ["/", "/", "/"],
    ["//api//v1//", "//users//", "/api/v1/users"]
  ])(
    "normalizes class prefix %s and method path %s",
    (classPrefix, methodPath, expected) => {
      expect(resolvePath(classPrefix, methodPath).path).toBe(expected);
    }
  );

  it("keeps path variables intact", () => {
    expect(resolvePath("/users", "/{id}").path).toBe("/users/{id}");
  });

  it("leaves dynamic class prefixes raw and emits a warning", () => {
    const result = resolvePath("Constants.API_PREFIX", "/users");

    expect(result.path).toBe("/Constants.API_PREFIX/users");
    expect(result.warnings).toEqual([
      {
        level: "warning",
        code: WarningCode.DYNAMIC_PREFIX,
        message:
          "Dynamic class-level route prefix 'Constants.API_PREFIX' could not be statically resolved; left raw text in path"
      }
    ]);
  });

  it("leaves property placeholders raw and emits a warning", () => {
    const result = resolvePath("${api.prefix}", "/users");

    expect(result.path).toBe("/${api.prefix}/users");
    expect(result.warnings).toContainEqual({
      level: "warning",
      code: WarningCode.DYNAMIC_PREFIX,
      message:
        "Dynamic class-level route prefix '${api.prefix}' could not be statically resolved; left raw text in path"
    });
  });

  it("warns on string concatenation expressions", () => {
    const result = resolvePath('"/api" + "/v1"', "/users");

    expect(result.path).toBe('/"/api" + "/v1"/users');
    expect(result.warnings[0]?.code).toBe(WarningCode.DYNAMIC_PREFIX);
  });
});
