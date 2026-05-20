import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  extractAuthAnnotations,
  endpointSecurity,
  sourceTreeHasSecurityFilterChain,
  SPRING_SECURITY_AUTH_SCHEME
} from "./parse-auth.js";

describe("extractAuthAnnotations", () => {
  it.each([
    ["@PreAuthorize"],
    ["@PostAuthorize"],
    ["@Secured"],
    ["@RolesAllowed"]
  ])("detects %s annotation", (annotation) => {
    expect(extractAuthAnnotations([annotation])).toEqual([annotation]);
  });

  it("filters out non-auth annotations", () => {
    expect(
      extractAuthAnnotations(["@GetMapping", "@PreAuthorize", "@Transactional"])
    ).toEqual(["@PreAuthorize"]);
  });

  it("returns empty array when no auth annotations present", () => {
    expect(extractAuthAnnotations(["@GetMapping", "@Override"])).toEqual([]);
  });
});

describe("endpointSecurity", () => {
  it("returns empty when no annotations on class or method", () => {
    expect(endpointSecurity([], [])).toEqual([]);
  });

  it("uses class-level annotation when no method annotation", () => {
    const result = endpointSecurity(["@Secured"], []);
    expect(result).toHaveLength(1);
    expect(result[0]?.schemeId).toBe(SPRING_SECURITY_AUTH_SCHEME.id);
    expect(result[0]?.description).toContain("@Secured");
  });

  it("method-level annotation overrides class-level", () => {
    const result = endpointSecurity(["@Secured"], ["@PreAuthorize"]);
    expect(result).toHaveLength(1);
    expect(result[0]?.description).toContain("@PreAuthorize");
    expect(result[0]?.description).not.toContain("@Secured");
  });

  it("combines multiple method-level annotations in description", () => {
    const result = endpointSecurity([], ["@Secured", "@RolesAllowed"]);
    expect(result[0]?.description).toContain("@Secured");
    expect(result[0]?.description).toContain("@RolesAllowed");
  });
});

describe("sourceTreeHasSecurityFilterChain", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "auth-test-"));
    await mkdir(join(tmpDir, "src"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns true when a @Bean SecurityFilterChain is present", async () => {
    await writeFile(
      join(tmpDir, "src", "SecurityConfig.java"),
      `
@Configuration
@EnableWebSecurity
public class SecurityConfig {
  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    return http.build();
  }
}
`
    );
    const result = await sourceTreeHasSecurityFilterChain(tmpDir, [
      "src/SecurityConfig.java"
    ]);
    expect(result).toBe(true);
  });

  it("returns false when no SecurityFilterChain is present", async () => {
    await writeFile(
      join(tmpDir, "src", "UserService.java"),
      "public class UserService {}"
    );
    const result = await sourceTreeHasSecurityFilterChain(tmpDir, [
      "src/UserService.java"
    ]);
    expect(result).toBe(false);
  });

  it("returns false when SecurityFilterChain is present but no @Bean", async () => {
    await writeFile(
      join(tmpDir, "src", "NotABean.java"),
      `
public class NotABean {
  public SecurityFilterChain filterChain(HttpSecurity http) { return null; }
}
`
    );
    const result = await sourceTreeHasSecurityFilterChain(tmpDir, [
      "src/NotABean.java"
    ]);
    expect(result).toBe(false);
  });
});
