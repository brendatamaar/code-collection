import { z } from "zod";

export const HttpMethod = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "TRACE"
]);

export const SourceLocation = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  endLine: z.number().int().positive().optional(),
  column: z.number().int().nonnegative().optional()
});

export const SchemaRef = z.object({
  $ref: z.string().startsWith("#/schemas/")
});

const PrimitiveSchema = z.object({
  type: z.enum(["string", "number", "integer", "boolean", "null"]),
  format: z.string().optional(),
  enum: z.array(z.unknown()).optional(),
  pattern: z.string().optional(),
  example: z.unknown().optional(),
  nullable: z.boolean().optional(),
  description: z.string().optional()
});

type SchemaT =
  | z.infer<typeof SchemaRef>
  | z.infer<typeof PrimitiveSchema>
  | {
      type: "array";
      items: SchemaT;
      example?: unknown;
      nullable?: boolean | undefined;
      description?: string | undefined;
    }
  | {
      type: "object";
      properties?: Record<string, SchemaT> | undefined;
      required?: string[] | undefined;
      additionalProperties?: boolean | undefined;
      example?: unknown;
      nullable?: boolean | undefined;
      description?: string | undefined;
    };

export const Schema: z.ZodType<SchemaT> = z.lazy(() =>
  z.union([
    SchemaRef,
    PrimitiveSchema,
    z.object({
      type: z.literal("array"),
      items: Schema,
      example: z.unknown().optional(),
      nullable: z.boolean().optional(),
      description: z.string().optional()
    }),
    z.object({
      type: z.literal("object"),
      properties: z.record(z.string(), Schema).optional(),
      required: z.array(z.string()).optional(),
      additionalProperties: z.boolean().optional(),
      example: z.unknown().optional(),
      nullable: z.boolean().optional(),
      description: z.string().optional()
    })
  ])
);

export const Parameter = z.object({
  name: z.string(),
  in: z.enum(["path", "query", "header", "cookie"]),
  required: z.boolean(),
  schema: Schema,
  description: z.string().optional(),
  example: z.unknown().optional(),
  deprecated: z.boolean().optional()
});

export const MediaType = z.object({
  schema: Schema,
  example: z.unknown().optional()
});

export const RequestBody = z.object({
  required: z.boolean(),
  content: z.record(z.string(), MediaType),
  description: z.string().optional()
});

export const Response = z.object({
  description: z.string().optional(),
  content: z.record(z.string(), MediaType).optional(),
  headers: z.record(z.string(), Parameter).optional(),
  example: z.unknown().optional()
});

export const AuthScheme = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("bearer"),
    bearerFormat: z.string().optional(),
    description: z.string().optional()
  }),
  z.object({
    id: z.string(),
    type: z.literal("basic"),
    description: z.string().optional()
  }),
  z.object({
    id: z.string(),
    type: z.literal("apiKey"),
    in: z.enum(["header", "query", "cookie"]),
    name: z.string(),
    description: z.string().optional()
  }),
  z.object({
    id: z.string(),
    type: z.literal("oauth2"),
    description: z.string().optional()
  }),
  z.object({
    id: z.string(),
    type: z.literal("custom"),
    description: z.string()
  })
]);

export const AuthRequirement = z.object({
  schemeId: z.string(),
  scopes: z.array(z.string()).optional(),
  description: z.string().optional()
});

export const Server = z.object({
  url: z.string(),
  description: z.string().optional(),
  variables: z
    .record(
      z.string(),
      z.object({
        default: z.string(),
        enum: z.array(z.string()).optional(),
        description: z.string().optional()
      })
    )
    .optional()
});

export const Endpoint = z.object({
  id: z.string(),
  method: HttpMethod,
  path: z.string().startsWith("/"),
  operationId: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  version: z.string().optional(),
  deprecated: z.boolean().optional(),
  parameters: z.array(Parameter).default([]),
  requestBody: RequestBody.optional(),
  responses: z.record(z.string(), Response).default({}),
  security: z.array(AuthRequirement).default([]),
  source: SourceLocation,
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const Warning = z.object({
  level: z.enum(["info", "warning", "error"]),
  code: z.string(),
  message: z.string(),
  source: SourceLocation.optional()
});

export const Info = z.object({
  title: z.string(),
  description: z.string().optional(),
  version: z.string().optional()
});

export const Metadata = z.object({
  extractedAt: z.string().datetime(),
  toolVersion: z.string(),
  stack: z.enum(["spring", "laravel", "go", "node"]),
  stackVariant: z.string().optional(),
  repoPath: z.string(),
  fileCount: z.number().int().nonnegative()
});

export const Tag = z.object({
  name: z.string(),
  description: z.string().optional()
});

export const IR = z.object({
  irVersion: z.literal("1.0"),
  metadata: Metadata,
  info: Info,
  servers: z.array(Server).default([]),
  auth: z.array(AuthScheme).default([]),
  tags: z.array(Tag).default([]),
  schemas: z.record(z.string(), Schema).default({}),
  endpoints: z.array(Endpoint),
  warnings: z.array(Warning).default([])
});

export type HttpMethod = z.infer<typeof HttpMethod>;
export type SourceLocation = z.infer<typeof SourceLocation>;
export type SchemaRef = z.infer<typeof SchemaRef>;
export type Schema = z.infer<typeof Schema>;
export type Parameter = z.infer<typeof Parameter>;
export type MediaType = z.infer<typeof MediaType>;
export type RequestBody = z.infer<typeof RequestBody>;
export type Response = z.infer<typeof Response>;
export type AuthScheme = z.infer<typeof AuthScheme>;
export type AuthRequirement = z.infer<typeof AuthRequirement>;
export type Server = z.infer<typeof Server>;
export type Endpoint = z.infer<typeof Endpoint>;
export type Warning = z.infer<typeof Warning>;
export type Info = z.infer<typeof Info>;
export type Metadata = z.infer<typeof Metadata>;
export type Tag = z.infer<typeof Tag>;
export type IR = z.infer<typeof IR>;
