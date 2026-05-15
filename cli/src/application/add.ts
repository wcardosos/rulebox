import path from 'node:path';
import type { Config } from '../domain/config';
import type { Result } from '../domain/result';
import { isValidRuleName, ruleNameToFilename } from '../domain/rule';
import type { ReadConfigError } from '../infrastructure/config-repository';
import { ERROR_CODES } from '../shared/error-codes';

export type AddArgs = {
  rules: string[];
};

export type AddDeps = {
  cwd: string;
  readConfig: (cwd: string) => Promise<Result<Config, ReadConfigError>>;
  writeConfig: (cwd: string, config: Config) => Promise<void>;
  ruleExists: (name: string) => Promise<boolean>;
  readRule: (name: string) => Promise<string>;
  outputDirExists: (dirPath: string) => Promise<boolean>;
  readExistingFile: (filePath: string) => Promise<string | null>;
  writeRuleFile: (filePath: string, content: string) => Promise<void>;
  deleteFile: (filePath: string) => Promise<void>;
};

export type AddOp = { name: string; op: 'Added' | 'Updated' };
export type RollbackFailure = { path: string; cause: string };

export type AddResult =
  | { kind: 'success'; operations: AddOp[] }
  | { kind: 'error'; code: typeof ERROR_CODES.NO_RULES_GIVEN }
  | { kind: 'error'; code: typeof ERROR_CODES.CONFIG_NOT_FOUND }
  | { kind: 'error'; code: typeof ERROR_CODES.INVALID_CONFIG_JSON; details: string }
  | { kind: 'error'; code: typeof ERROR_CODES.INVALID_CONFIG_SCHEMA; details: string }
  | { kind: 'error'; code: typeof ERROR_CODES.OUTPUT_DIR_NOT_FOUND; path: string }
  | { kind: 'error'; code: typeof ERROR_CODES.UNKNOWN_RULES; rules: string[] }
  | {
      kind: 'error';
      code: typeof ERROR_CODES.IO_ERROR_WRITE_RULES;
      message: string;
      rolledBack: boolean;
      partialRollbackFailures: RollbackFailure[];
    }
  | {
      kind: 'error';
      code: typeof ERROR_CODES.IO_ERROR_WRITE_CONFIG;
      message: string;
      rolledBack: boolean;
      partialRollbackFailures: RollbackFailure[];
    };

export async function addCore(args: AddArgs, deps: AddDeps): Promise<AddResult> {
  if (args.rules.length === 0) {
    return { kind: 'error', code: ERROR_CODES.NO_RULES_GIVEN };
  }

  const configResult = await deps.readConfig(deps.cwd);
  if (configResult.kind === 'error') {
    switch (configResult.error.kind) {
      case 'NOT_FOUND':
        return { kind: 'error', code: ERROR_CODES.CONFIG_NOT_FOUND };
      case 'INVALID_JSON':
        return {
          kind: 'error',
          code: ERROR_CODES.INVALID_CONFIG_JSON,
          details: configResult.error.details,
        };
      case 'INVALID_SCHEMA':
        return {
          kind: 'error',
          code: ERROR_CODES.INVALID_CONFIG_SCHEMA,
          details: configResult.error.details,
        };
    }
  }
  const config = configResult.value;

  const outputDir = path.resolve(deps.cwd, config.output);
  if (!(await deps.outputDirExists(outputDir))) {
    return { kind: 'error', code: ERROR_CODES.OUTPUT_DIR_NOT_FOUND, path: outputDir };
  }

  const unknown: string[] = [];
  for (const name of args.rules) {
    if (!isValidRuleName(name) || !(await deps.ruleExists(name))) {
      unknown.push(name);
    }
  }
  if (unknown.length > 0) {
    return { kind: 'error', code: ERROR_CODES.UNKNOWN_RULES, rules: unknown };
  }

  const existingSet = new Set(config.rules);
  const operations: AddOp[] = args.rules.map((name) => ({
    name,
    op: existingSet.has(name) ? 'Updated' : 'Added',
  }));

  const targetPaths = args.rules.map((name) => path.join(outputDir, ruleNameToFilename(name)));

  const snapshots: Map<string, string | null> = new Map();
  for (const p of targetPaths) {
    if (!snapshots.has(p)) {
      snapshots.set(p, await deps.readExistingFile(p));
    }
  }

  const contents: string[] = [];
  for (const name of args.rules) {
    contents.push(await deps.readRule(name));
  }

  const written: string[] = [];
  for (let i = 0; i < args.rules.length; i++) {
    const filePath = targetPaths[i];
    try {
      await deps.writeRuleFile(filePath, contents[i]);
      written.push(filePath);
    } catch (e) {
      const { rolledBack, failures } = await rollback(written, snapshots, deps);
      return {
        kind: 'error',
        code: ERROR_CODES.IO_ERROR_WRITE_RULES,
        message: (e as Error).message ?? String(e),
        rolledBack,
        partialRollbackFailures: failures,
      };
    }
  }

  const addedNames = operations.filter((o) => o.op === 'Added').map((o) => o.name);
  const newRules = Array.from(new Set([...config.rules, ...addedNames]));
  const newConfig: Config = { ...config, rules: newRules };

  try {
    await deps.writeConfig(deps.cwd, newConfig);
  } catch (e) {
    const { rolledBack, failures } = await rollback(written, snapshots, deps);
    return {
      kind: 'error',
      code: ERROR_CODES.IO_ERROR_WRITE_CONFIG,
      message: (e as Error).message ?? String(e),
      rolledBack,
      partialRollbackFailures: failures,
    };
  }

  return { kind: 'success', operations };
}

async function rollback(
  written: string[],
  snapshots: Map<string, string | null>,
  deps: AddDeps,
): Promise<{ rolledBack: boolean; failures: RollbackFailure[] }> {
  const failures: RollbackFailure[] = [];
  for (const filePath of written) {
    const prev = snapshots.get(filePath) ?? null;
    try {
      if (prev === null) {
        await deps.deleteFile(filePath);
      } else {
        await deps.writeRuleFile(filePath, prev);
      }
    } catch (e) {
      failures.push({ path: filePath, cause: (e as Error).message ?? String(e) });
    }
  }
  return { rolledBack: failures.length === 0, failures };
}
