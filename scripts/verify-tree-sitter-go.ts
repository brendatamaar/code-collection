import { GO_ROUTE_CALL_QUERY } from "../packages/parser-go/src/queries.js";
import {
  createGoQuery,
  parseGoSource
} from "../packages/parser-go/src/tree-sitter.js";

const fixture = `
package main

func main() {
  r.GET("/users", listUsers)
  http.HandleFunc("GET /health", health)
  app.Post("/orders", createOrder)
}
`;

const query = createGoQuery(GO_ROUTE_CALL_QUERY);
const tree = parseGoSource(fixture);
const captures = query.captures(tree.rootNode);
const methods = captures
  .filter((capture) => capture.name === "route.method")
  .map((capture) => capture.node.text);
const paths = captures
  .filter((capture) => capture.name === "route.path")
  .map((capture) => capture.node.text);

for (const method of ["GET", "HandleFunc", "Post"]) {
  if (!methods.includes(method)) {
    throw new Error(`Go route query missing method ${method}`);
  }
}

for (const path of ['"/users"', '"GET /health"', '"/orders"']) {
  if (!paths.includes(path)) {
    throw new Error(`Go route query missing path ${path}`);
  }
}

process.stderr.write("Verified 1 tree-sitter Go query\n");
