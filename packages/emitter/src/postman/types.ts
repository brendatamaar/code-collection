export interface PostmanInfo {
  name: string;
  schema: string;
  _postman_id: string;
  description?: string;
}

export interface PostmanVariable {
  key: string;
  value: string;
  type?: "string" | "default" | "secret";
}

export type PostmanAuth =
  | {
      type: "bearer";
      bearer: { key: "token"; value: "{{bearerToken}}"; type: "string" }[];
    }
  | {
      type: "basic";
      basic: (
        | { key: "username"; value: "{{username}}"; type: "string" }
        | { key: "password"; value: "{{password}}"; type: "string" }
      )[];
    }
  | {
      type: "apikey";
      apikey: (
        | { key: "key"; value: string; type: "string" }
        | { key: "value"; value: "{{apiKey}}"; type: "string" }
        | { key: "in"; value: "header" | "query" | "cookie"; type: "string" }
      )[];
    }
  | {
      type: "oauth2";
      oauth2: { key: string; value: string; type: "string" }[];
    }
  | {
      type: "noauth";
    };

export interface PostmanCollection {
  info: PostmanInfo;
  item: unknown[];
  variable?: PostmanVariable[];
  auth?: PostmanAuth;
}
