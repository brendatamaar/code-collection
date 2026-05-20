# Spring Alpha Fixture

This fixture exercises the alpha vertical slice for Spring Boot:

- Spring Boot detection via `pom.xml`
- `@RestController` plus class-level `@RequestMapping`
- GET, POST, PUT, PATCH, and DELETE endpoint extraction
- Path, query, and header parameters
- JSON request bodies from `@RequestBody`
- Primitive DTO field inference for request and response DTOs
- Deterministic Postman collection emission

Deliberately left for beta:

- Constant and property-placeholder path resolution
- Multiple paths or HTTP methods per annotation
- Auth annotations
- Lombok, inheritance, records, generics-heavy DTOs, and cross-file DTO inference
- Servlet context path and version discovery beyond literal path segments
