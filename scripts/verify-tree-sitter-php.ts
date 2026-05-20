import {
  LARAVEL_CONTROLLER_QUERY,
  LARAVEL_ROUTE_CALL_QUERY
} from "../packages/parser-laravel/src/queries.js";
import {
  createPhpQuery,
  parsePhpSource
} from "../packages/parser-laravel/src/tree-sitter.js";

const fixture = `
<?php
Route::group(['prefix' => '/api/v1', 'middleware' => 'auth'], function () {
  Route::get('/users', [UserController::class, 'index']);
});

class UserController {
  public function index() {}
}
`;

const tree = parsePhpSource(fixture);
const routeCaptures = createPhpQuery(LARAVEL_ROUTE_CALL_QUERY).captures(tree.rootNode);
const controllerCaptures = createPhpQuery(LARAVEL_CONTROLLER_QUERY).captures(
  tree.rootNode
);
const routeMethods = routeCaptures
  .filter((capture) => capture.name === "route.method")
  .map((capture) => capture.node.text);
const controllerNames = controllerCaptures
  .filter((capture) => capture.name === "controller.name")
  .map((capture) => capture.node.text);
const methodNames = controllerCaptures
  .filter((capture) => capture.name === "controller.method.name")
  .map((capture) => capture.node.text);

for (const method of ["group", "get"]) {
  if (!routeMethods.includes(method)) {
    throw new Error(`Laravel route query missing method ${method}`);
  }
}

if (!controllerNames.includes("UserController")) {
  throw new Error("Laravel controller query missing UserController");
}

if (!methodNames.includes("index")) {
  throw new Error("Laravel controller query missing index method");
}

process.stderr.write("Verified 2 tree-sitter PHP queries\n");
