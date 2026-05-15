import path from "node:path";
import type { Config } from "../domain/config";
import { CONFIG_VERSION, DEFAULT_OUTPUT } from "../domain/config";

export type InitArgs = {
  output?: string;
};

export type InitDeps = {
  cwd: string;
  configExists: (cwd: string) => Promise<boolean>;
  writeConfig: (cwd: string, config: Config) => Promise<void>;
  ensureOutputDir: (dirPath: string) => Promise<{ created: boolean }>;
};

export type InitResult =
  | { kind: "success"; dirCreated: boolean; output: string }
  | { kind: "error"; code: "ALREADY_INITIALIZED" }
  | { kind: "error"; code: "INVALID_OUTPUT"; reason: string }
  | { kind: "error"; code: "IO_ERROR"; message: string; cause?: string };

export async function initCore(args: InitArgs, deps: InitDeps): Promise<InitResult> {
  const output = args.output ?? DEFAULT_OUTPUT;

  if (args.output !== undefined) {
    const reason = validateOutput(args.output, deps.cwd);
    if (reason !== null) {
      return { kind: "error", code: "INVALID_OUTPUT", reason };
    }
  }

  if (await deps.configExists(deps.cwd)) {
    return { kind: "error", code: "ALREADY_INITIALIZED" };
  }

  const resolvedOutput = path.resolve(deps.cwd, output);

  let dirCreated: boolean;
  try {
    const { created } = await deps.ensureOutputDir(resolvedOutput);
    dirCreated = created;
  } catch (e) {
    return toIoError(e);
  }

  const config: Config = { version: CONFIG_VERSION, output, rules: [] };
  try {
    await deps.writeConfig(deps.cwd, config);
  } catch (e) {
    return toIoError(e);
  }

  return { kind: "success", dirCreated, output };
}

function validateOutput(output: string, cwd: string): string | null {
  if (output.trim().length === 0) {
    return "must not be empty";
  }
  if (output.includes("\0")) {
    return "must not contain null bytes";
  }
  if (/^[a-zA-Z]:[/\\]/.test(output)) {
    return "must not be an absolute path";
  }
  if (path.isAbsolute(output)) {
    return "must not be an absolute path";
  }
  const resolved = path.resolve(cwd, output);
  if (resolved === cwd) {
    return "must not point to the project directory itself";
  }
  if (!resolved.startsWith(cwd + path.sep)) {
    return "must not escape the project directory";
  }
  return null;
}

function toIoError(e: unknown): InitResult {
  const node = e as NodeJS.ErrnoException;
  return { kind: "error", code: "IO_ERROR", message: node.message ?? String(e), cause: node.code };
}
