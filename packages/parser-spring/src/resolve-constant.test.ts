import { describe, expect, it } from "vitest";

import {
  buildConstantIndex,
  parseJavaConstants,
  resolveConstantExpression,
  type ConstantIndex
} from "./resolve-constant.js";

function makeIndex(files: { file: string; content: string }[]): ConstantIndex {
  const index: ConstantIndex = { files: new Map(), classes: new Map() };
  for (const { file, content } of files) {
    const parsed = parseJavaConstants(file, content);
    if (!parsed) {
      continue;
    }
    index.files.set(file, parsed);
    index.classes.set(parsed.className, parsed);
    index.classes.set(`${parsed.packageName}.${parsed.className}`, parsed);
  }
  return index;
}

const SAME_CLASS_JAVA = `
package com.example;
public class ApiRoutes {
  public static final String BASE = "/api";
  public static final String VERSIONED = BASE + "/v1";
  public static final String USERS = VERSIONED + "/users";
}
`;

const CONSTANTS_JAVA = `
package com.example.constants;
public class Constants {
  public static final String PREFIX = "/base";
}
`;

const CONSUMER_JAVA = `
package com.example;
import com.example.constants.Constants;
public class MyController {
  public static final String PATH = Constants.PREFIX + "/items";
}
`;

describe("parseJavaConstants", () => {
  it("extracts class name, package, imports, and constants", () => {
    const parsed = parseJavaConstants("ApiRoutes.java", SAME_CLASS_JAVA);

    expect(parsed?.className).toBe("ApiRoutes");
    expect(parsed?.packageName).toBe("com.example");
    expect(parsed?.constants.get("BASE")).toBe('"/api"');
  });

  it("returns undefined when no class declaration found", () => {
    expect(parseJavaConstants("Empty.java", "package com.example;")).toBeUndefined();
  });
});

describe("resolveConstantExpression — same-class constants", () => {
  it("resolves a simple string literal", () => {
    const index = makeIndex([{ file: "ApiRoutes.java", content: SAME_CLASS_JAVA }]);
    const result = resolveConstantExpression(index, "ApiRoutes.java", '"hello"');

    expect(result.value).toBe("hello");
    expect(result.warnings).toHaveLength(0);
  });

  it("resolves an identifier in the same file", () => {
    const index = makeIndex([{ file: "ApiRoutes.java", content: SAME_CLASS_JAVA }]);
    const result = resolveConstantExpression(index, "ApiRoutes.java", "BASE");

    expect(result.value).toBe("/api");
    expect(result.warnings).toHaveLength(0);
  });

  it("resolves a concatenation expression in the same file", () => {
    const index = makeIndex([{ file: "ApiRoutes.java", content: SAME_CLASS_JAVA }]);
    const result = resolveConstantExpression(index, "ApiRoutes.java", 'BASE + "/v1"');

    expect(result.value).toBe("/api/v1");
  });

  it("resolves a constant that chains two hops (BASE → literal, VERSIONED → BASE + literal)", () => {
    const index = makeIndex([{ file: "ApiRoutes.java", content: SAME_CLASS_JAVA }]);
    const result = resolveConstantExpression(index, "ApiRoutes.java", "VERSIONED");

    expect(result.value).toBe("/api/v1");
    expect(result.warnings).toHaveLength(0);
  });
});

describe("resolveConstantExpression — imported constants (field access)", () => {
  it("resolves Constants.PREFIX from an import", () => {
    const index = makeIndex([
      { file: "constants/Constants.java", content: CONSTANTS_JAVA },
      { file: "MyController.java", content: CONSUMER_JAVA }
    ]);
    const result = resolveConstantExpression(
      index,
      "MyController.java",
      "Constants.PREFIX"
    );

    expect(result.value).toBe("/base");
    expect(result.warnings).toHaveLength(0);
  });

  it("resolves a concatenation using an imported constant", () => {
    const index = makeIndex([
      { file: "constants/Constants.java", content: CONSTANTS_JAVA },
      { file: "MyController.java", content: CONSUMER_JAVA }
    ]);
    const result = resolveConstantExpression(
      index,
      "MyController.java",
      'Constants.PREFIX + "/items"'
    );

    expect(result.value).toBe("/base/items");
  });
});

describe("resolveConstantExpression — missing / unresolved", () => {
  it("emits UNRESOLVED_CONSTANT when identifier is not found", () => {
    const index = makeIndex([{ file: "ApiRoutes.java", content: SAME_CLASS_JAVA }]);
    const result = resolveConstantExpression(index, "ApiRoutes.java", "MISSING_CONST");

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.code).toBe("UNRESOLVED_CONSTANT");
    expect(result.value).toBe("MISSING_CONST");
  });

  it("emits UNRESOLVED_CONSTANT for unknown class field access", () => {
    const index = makeIndex([{ file: "ApiRoutes.java", content: SAME_CLASS_JAVA }]);
    const result = resolveConstantExpression(
      index,
      "ApiRoutes.java",
      "Unknown.FIELD"
    );

    expect(result.warnings[0]?.code).toBe("UNRESOLVED_CONSTANT");
  });
});

describe("buildConstantIndex", () => {
  it("indexes multiple files and returns a populated index", async () => {
    const index = makeIndex([
      { file: "constants/Constants.java", content: CONSTANTS_JAVA },
      { file: "ApiRoutes.java", content: SAME_CLASS_JAVA }
    ]);

    expect(index.classes.has("Constants")).toBe(true);
    expect(index.classes.has("ApiRoutes")).toBe(true);
    expect(index.files.has("constants/Constants.java")).toBe(true);
  });
});
