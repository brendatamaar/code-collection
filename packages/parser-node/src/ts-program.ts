import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

import ts from "typescript";

export function createProgram(files: string[], tsConfig?: string): ts.Program {
  const rootFiles = files.map((file) => resolve(file));
  const configPath = tsConfig && existsSync(tsConfig)
    ? tsConfig
    : findConfig(rootFiles);
  const options = configPath
    ? readCompilerOptions(configPath)
    : defaultCompilerOptions();

  return ts.createProgram(rootFiles, options);
}

function findConfig(files: string[]): string | undefined {
  const firstDir = files[0] ? dirname(resolve(files[0])) : process.cwd();
  const found = ts.findConfigFile(firstDir, existsSync, "tsconfig.json");
  return found;
}

function readCompilerOptions(configPath: string): ts.CompilerOptions {
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    dirname(configPath)
  );
  return parsed.options;
}

function defaultCompilerOptions(): ts.CompilerOptions {
  return {
    allowJs: true,
    checkJs: false,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
    skipLibCheck: true
  };
}
