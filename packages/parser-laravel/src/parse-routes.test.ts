import { describe, expect, it } from "vitest";

import { parseLaravelRouteFile } from "./parse-routes.js";

describe("parseLaravelRouteFile", () => {
  it("expands groups, auth middleware, and Route::any", () => {
    const result = parseLaravelRouteFile(
      "routes/api.php",
      `
Route::group(['prefix' => '/api/v1', 'middleware' => 'auth'], function () {
  Route::get('/users', [UserController::class, 'index']);
  Route::any('/search', 'SearchController@search');
});
`
    );

    expect(result.routes.map((route) => `${route.endpoint.method} ${route.endpoint.path}`)).toEqual([
      "GET /api/v1/users",
      "GET /api/v1/search",
      "POST /api/v1/search",
      "PUT /api/v1/search",
      "PATCH /api/v1/search",
      "DELETE /api/v1/search",
      "HEAD /api/v1/search",
      "OPTIONS /api/v1/search"
    ]);
    expect(result.routes[0]?.endpoint.security).toEqual([
      {
        schemeId: "laravel-auth",
        description: "Laravel middleware: auth"
      }
    ]);
  });
});
