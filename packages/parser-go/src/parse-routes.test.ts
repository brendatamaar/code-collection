import { describe, expect, it } from "vitest";

import { parseGoRoutes } from "./parse-routes.js";

describe("parseGoRoutes", () => {
  it("extracts stdlib method-prefixed patterns and grouped Gin routes", () => {
    const endpoints = parseGoRoutes(
      "main.go",
      `
func main() {
  v1 := r.Group("/v1")
  v1.GET("/users", AuthRequired(listUsers))
  mux.HandleFunc("POST /users/{id}", updateUser)
}
`
    );

    expect(endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`)).toEqual([
      "GET /v1/users",
      "POST /users/{id}"
    ]);
    expect(endpoints[0]?.security[0]?.schemeId).toBe("go-auth");
    expect(endpoints[1]?.parameters[0]?.name).toBe("id");
  });
});
