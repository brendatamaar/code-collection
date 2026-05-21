export interface InsomniaExport {
  __export_format: 4;
  __export_date: string;
  __export_source: string;
  resources: InsomniaResource[];
}

export type InsomniaResource =
  | InsomniaWorkspace
  | InsomniaEnvironment
  | InsomniaRequestGroup
  | InsomniaRequest;

interface InsomniaBase {
  _id: string;
  _type: string;
  parentId: string | null;
  modified: 0;
  created: 0;
}

export interface InsomniaWorkspace extends InsomniaBase {
  _type: "workspace";
  parentId: null;
  name: string;
  description: string;
  scope: "collection";
}

export interface InsomniaEnvironment extends InsomniaBase {
  _type: "environment";
  name: string;
  data: Record<string, string>;
  dataPropertyOrder: null;
  color: null;
  isPrivate: boolean;
  metaSortKey: number;
}

export interface InsomniaRequestGroup extends InsomniaBase {
  _type: "request_group";
  name: string;
  description: string;
  environment: Record<string, never>;
  environmentPropertyOrder: null;
  metaSortKey: number;
}

export interface InsomniaAuthentication {
  type: "bearer" | "basic" | "apikey" | "oauth2" | "none";
  token?: string;
  prefix?: string;
  username?: string;
  password?: string;
  key?: string;
  value?: string;
  addTo?: string;
  disabled?: boolean;
}

export interface InsomniaHeader {
  name: string;
  value: string;
  disabled: boolean;
}

export interface InsomniaQueryParam {
  name: string;
  value: string;
  disabled: boolean;
}

export interface InsomniaBodyParam {
  name: string;
  value: string;
  disabled: boolean;
  type?: "file";
}

export interface InsomniaBody {
  mimeType?: string;
  text?: string;
  params?: InsomniaBodyParam[];
}

export interface InsomniaRequest extends InsomniaBase {
  _type: "request";
  url: string;
  name: string;
  description: string;
  method: string;
  body: InsomniaBody;
  parameters: InsomniaQueryParam[];
  headers: InsomniaHeader[];
  authentication: InsomniaAuthentication;
  isPrivate: boolean;
  settingStoreCookies: boolean;
  settingSendCookies: boolean;
  settingDisableRenderRequestBody: boolean;
  settingEncodeUrl: boolean;
  settingRebuildPath: boolean;
  settingFollowRedirects: "global";
  metaSortKey: number;
}
