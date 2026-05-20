import { describe, expect, it } from "vitest";

import { parseLaravelRouteFile } from "./parse-routes.js";

describe("Laravel route groups", () => {
  it("composes prefix from a single group", () => {
    const { routes } = parseLaravelRouteFile(
      "routes/api.php",
      `
Route::group(['prefix' => '/api/v1'], function () {
  Route::get('/users', 'UserController@index');
});
`
    );

    expect(routes.map((r) => r.endpoint.path)).toEqual(["/api/v1/users"]);
  });

  it("composes nested group prefixes", () => {
    const { routes } = parseLaravelRouteFile(
      "routes/api.php",
      `
Route::group(['prefix' => '/api'], function () {
  Route::group(['prefix' => '/v1'], function () {
    Route::get('/orders', 'OrderController@index');
  });
});
`
    );

    expect(routes.map((r) => r.endpoint.path)).toEqual(["/api/v1/orders"]);
  });

  it("applies auth middleware from group to all routes inside", () => {
    const { routes } = parseLaravelRouteFile(
      "routes/api.php",
      `
Route::group(['middleware' => 'auth'], function () {
  Route::post('/login', 'AuthController@login');
});
`
    );

    expect(routes[0]?.endpoint.security).toHaveLength(1);
    expect(routes[0]?.endpoint.security[0]?.schemeId).toBe("laravel-auth");
  });

  it("group with prefix only does not add auth", () => {
    const { routes } = parseLaravelRouteFile(
      "routes/api.php",
      `
Route::group(['prefix' => '/public'], function () {
  Route::get('/health', 'HealthController@check');
});
`
    );

    expect(routes[0]?.endpoint.security).toHaveLength(0);
    expect(routes[0]?.endpoint.path).toBe("/public/health");
  });

  it("group with middleware only does not modify path", () => {
    const { routes } = parseLaravelRouteFile(
      "routes/api.php",
      `
Route::group(['middleware' => 'sanctum'], function () {
  Route::get('/profile', 'ProfileController@show');
});
`
    );

    expect(routes[0]?.endpoint.path).toBe("/profile");
    expect(routes[0]?.endpoint.security).toHaveLength(1);
  });
});
