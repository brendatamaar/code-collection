import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createJavaQuery, parseFile } from "../packages/parser-spring/src/tree-sitter.js";
import {
  AUTH_ANNOTATION_QUERY,
  CLASS_REQUEST_MAPPING_QUERY,
  CONTROLLER_CLASS_QUERY,
  METHOD_MAPPING_QUERY,
  METHOD_PARAMETER_QUERY,
  SPRING_QUERIES
} from "../packages/parser-spring/src/queries.js";

interface QueryExpectation {
  fixture: string;
  queryName: keyof typeof SPRING_QUERIES;
  query: string;
  captures: Record<string, string[]>;
}

const fixtureDir = join(
  process.cwd(),
  "packages",
  "parser-spring",
  "tests",
  "fixtures",
  "verify-input"
);

const expectations: QueryExpectation[] = [
  {
    fixture: "SimpleController.java",
    queryName: "CONTROLLER_CLASS_QUERY",
    query: CONTROLLER_CLASS_QUERY,
    captures: {
      anno_name: ["RestController"],
      class_name: ["SimpleController"]
    }
  },
  {
    fixture: "SimpleController.java",
    queryName: "CLASS_REQUEST_MAPPING_QUERY",
    query: CLASS_REQUEST_MAPPING_QUERY,
    captures: {
      anno: ["RequestMapping"],
      args: ['("/api/v1/users")']
    }
  },
  {
    fixture: "SimpleController.java",
    queryName: "METHOD_MAPPING_QUERY",
    query: METHOD_MAPPING_QUERY,
    captures: {
      anno: ["GetMapping"],
      method_name: ["getUser"],
      return_type: ["UserDTO"]
    }
  },
  {
    fixture: "WithParameters.java",
    queryName: "METHOD_PARAMETER_QUERY",
    query: METHOD_PARAMETER_QUERY,
    captures: {
      anno: ["RequestParam", "RequestHeader", "CookieValue", "RequestBody"],
      param_name: ["q", "requestId", "session", "body"],
      param_type: ["String", "String", "String", "SearchRequest"]
    }
  },
  {
    fixture: "WithParameters.java",
    queryName: "AUTH_ANNOTATION_QUERY",
    query: AUTH_ANNOTATION_QUERY,
    captures: {
      anno: ["PreAuthorize"],
      args: ['("hasRole(\'ADMIN\')")']
    }
  }
];

for (const query of Object.values(SPRING_QUERIES)) {
  createJavaQuery(query);
}

for (const expectation of expectations) {
  const source = await readFile(join(fixtureDir, expectation.fixture), "utf8");
  const tree = parseFile(source);
  const query = createJavaQuery(expectation.query);
  const captures = query.captures(tree.rootNode);

  for (const [captureName, expectedTexts] of Object.entries(expectation.captures)) {
    const actualTexts = captures
      .filter((capture) => capture.name === captureName)
      .map((capture) => capture.node.text);

    for (const expectedText of expectedTexts) {
      if (!actualTexts.includes(expectedText)) {
        throw new Error(
          `${expectation.queryName} on ${expectation.fixture} missing @${captureName} capture '${expectedText}'. Found: ${actualTexts.join(", ")}`
        );
      }
    }
  }
}

process.stderr.write(
  `Verified ${Object.keys(SPRING_QUERIES).length} tree-sitter Java queries\n`
);
