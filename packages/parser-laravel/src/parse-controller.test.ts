import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

type ObjSchema = { properties?: Record<string, unknown>; required?: string[] };

import { requestBodyForHandler } from "./parse-controller.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "laravel-controller-"));
  await mkdir(join(tmpDir, "app", "Http", "Controllers"), { recursive: true });
  await mkdir(join(tmpDir, "app", "Http", "Requests"), { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("requestBodyForHandler", () => {
  it("returns undefined for undefined handler", () => {
    expect(requestBodyForHandler(tmpDir, undefined)).toBeUndefined();
  });

  it("returns undefined when controller file does not exist", () => {
    expect(requestBodyForHandler(tmpDir, "MissingController@store")).toBeUndefined();
  });

  it("returns undefined when method has no FormRequest type-hint", async () => {
    await writeFile(
      join(tmpDir, "app", "Http", "Controllers", "UserController.php"),
      `<?php
class UserController {
  public function store(Request $request) {}
}`
    );
    expect(requestBodyForHandler(tmpDir, "UserController@store")).toBeUndefined();
  });

  it("resolves FormRequest rules and returns request body schema", async () => {
    await writeFile(
      join(tmpDir, "app", "Http", "Controllers", "UserController.php"),
      `<?php
class UserController {
  public function store(CreateUserRequest $request) {}
}`
    );
    await writeFile(
      join(tmpDir, "app", "Http", "Requests", "CreateUserRequest.php"),
      `<?php
class CreateUserRequest extends FormRequest {
  public function rules(): array {
    return [
      'name' => ['required', 'string'],
      'email' => ['required', 'email'],
      'age' => ['required', 'integer'],
    ];
  }
}`
    );
    const result = requestBodyForHandler(tmpDir, "UserController@store");
    expect(result).toBeDefined();
    const schema = result?.content?.["application/json"]?.schema as ObjSchema | undefined;
    expect(schema?.properties?.["name"]).toEqual({ type: "string" });
    expect(schema?.properties?.["email"]).toEqual({ type: "string", format: "email" });
    expect(schema?.properties?.["age"]).toEqual({ type: "integer" });
    expect(schema?.required).toContain("name");
  });

  it("handles FormRequest with nested rules (dotted notation)", async () => {
    await writeFile(
      join(tmpDir, "app", "Http", "Controllers", "OrderController.php"),
      `<?php
class OrderController {
  public function store(CreateOrderRequest $request) {}
}`
    );
    await writeFile(
      join(tmpDir, "app", "Http", "Requests", "CreateOrderRequest.php"),
      `<?php
class CreateOrderRequest extends FormRequest {
  public function rules(): array {
    return [
      'items' => ['required', 'array'],
      'items.name' => ['required', 'string'],
    ];
  }
}`
    );
    const result = requestBodyForHandler(tmpDir, "OrderController@store");
    const schema = result?.content?.["application/json"]?.schema as ObjSchema | undefined;
    expect(schema?.properties?.["items"]).toBeDefined();
  });
});
