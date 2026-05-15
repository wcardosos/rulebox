import { describe, expect, it, vi } from 'vitest';
import type { Config } from '../domain/config';
import { err, ok } from '../domain/result';
import type { AddDeps, AddResult } from './add';
import { addCore } from './add';

const CWD = '/project';

function makeConfig(rules: string[] = []): Config {
  return { version: '1', output: '.rules', rules };
}

function makeDeps(overrides: Partial<AddDeps> = {}): AddDeps {
  const registry: Record<string, string> = {
    'nextjs/app-router': '# nextjs/app-router content',
    'drizzle/sqlite': '# drizzle/sqlite content',
    'typescript/strict': '# typescript/strict content',
  };
  return {
    cwd: CWD,
    readConfig: vi.fn().mockResolvedValue(ok(makeConfig())),
    writeConfig: vi.fn().mockResolvedValue(undefined),
    ruleExists: vi.fn().mockImplementation(async (name: string) => name in registry),
    readRule: vi.fn().mockImplementation(async (name: string) => {
      if (!(name in registry)) throw new Error(`unknown rule ${name}`);
      return registry[name];
    }),
    outputDirExists: vi.fn().mockResolvedValue(true),
    readExistingFile: vi.fn().mockResolvedValue(null),
    writeRuleFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('addCore — argument validation', () => {
  it('returns NO_RULES_GIVEN when no rules are passed', async () => {
    const deps = makeDeps();
    const result = await addCore({ rules: [] }, deps);
    expect(result).toEqual({ kind: 'error', code: 'NO_RULES_GIVEN' });
    expect(deps.readConfig).not.toHaveBeenCalled();
    expect(deps.writeConfig).not.toHaveBeenCalled();
  });
});

describe('addCore — config pre-conditions', () => {
  it('returns CONFIG_NOT_FOUND when rulebox.json is missing', async () => {
    const deps = makeDeps({
      readConfig: vi.fn().mockResolvedValue(err({ kind: 'NOT_FOUND' })),
    });
    const result = await addCore({ rules: ['nextjs/app-router'] }, deps);
    expect(result).toEqual({ kind: 'error', code: 'CONFIG_NOT_FOUND' });
    expect(deps.writeConfig).not.toHaveBeenCalled();
    expect(deps.writeRuleFile).not.toHaveBeenCalled();
  });

  it('returns INVALID_CONFIG_JSON when rulebox.json has invalid JSON', async () => {
    const deps = makeDeps({
      readConfig: vi
        .fn()
        .mockResolvedValue(err({ kind: 'INVALID_JSON', details: 'Unexpected token' })),
    });
    const result = await addCore({ rules: ['nextjs/app-router'] }, deps);
    expect(result).toEqual({
      kind: 'error',
      code: 'INVALID_CONFIG_JSON',
      details: 'Unexpected token',
    });
  });

  it('returns INVALID_CONFIG_SCHEMA when rulebox.json fails schema validation', async () => {
    const deps = makeDeps({
      readConfig: vi
        .fn()
        .mockResolvedValue(err({ kind: 'INVALID_SCHEMA', details: "version must be '1'" })),
    });
    const result = await addCore({ rules: ['nextjs/app-router'] }, deps);
    expect(result).toEqual({
      kind: 'error',
      code: 'INVALID_CONFIG_SCHEMA',
      details: "version must be '1'",
    });
  });

  it('returns OUTPUT_DIR_NOT_FOUND when output directory is missing', async () => {
    const deps = makeDeps({ outputDirExists: vi.fn().mockResolvedValue(false) });
    const result = await addCore({ rules: ['nextjs/app-router'] }, deps);
    expect(result).toMatchObject({ kind: 'error', code: 'OUTPUT_DIR_NOT_FOUND' });
    expect(deps.writeRuleFile).not.toHaveBeenCalled();
    expect(deps.writeConfig).not.toHaveBeenCalled();
  });
});

describe('addCore — registry validation', () => {
  it('returns UNKNOWN_RULES when a single rule does not exist in the registry', async () => {
    const deps = makeDeps();
    const result = await addCore({ rules: ['foo/bar'] }, deps);
    expect(result).toEqual({ kind: 'error', code: 'UNKNOWN_RULES', rules: ['foo/bar'] });
    expect(deps.writeRuleFile).not.toHaveBeenCalled();
    expect(deps.writeConfig).not.toHaveBeenCalled();
  });

  it('returns UNKNOWN_RULES listing all invalid rules', async () => {
    const deps = makeDeps();
    const result = await addCore({ rules: ['nextjs/app-router', 'foo/bar', 'baz/qux'] }, deps);
    expect(result).toEqual({
      kind: 'error',
      code: 'UNKNOWN_RULES',
      rules: ['foo/bar', 'baz/qux'],
    });
    expect(deps.writeRuleFile).not.toHaveBeenCalled();
  });

  it('treats versioned rule names as UNKNOWN_RULES', async () => {
    const deps = makeDeps();
    const result = await addCore({ rules: ['nextjs/app-router@0.2.0'] }, deps);
    expect(result).toEqual({
      kind: 'error',
      code: 'UNKNOWN_RULES',
      rules: ['nextjs/app-router@0.2.0'],
    });
    expect(deps.ruleExists).not.toHaveBeenCalledWith('nextjs/app-router@0.2.0');
  });

  it('treats malformed (uppercase) rule names as UNKNOWN_RULES', async () => {
    const deps = makeDeps();
    const result = await addCore({ rules: ['Nextjs/app-router'] }, deps);
    expect(result).toEqual({
      kind: 'error',
      code: 'UNKNOWN_RULES',
      rules: ['Nextjs/app-router'],
    });
  });
});

describe('addCore — success', () => {
  it('adds a new rule, writes the file, updates the config', async () => {
    const deps = makeDeps();
    const result = await addCore({ rules: ['nextjs/app-router'] }, deps);
    expect(result).toEqual({
      kind: 'success',
      operations: [{ name: 'nextjs/app-router', op: 'Added' }],
    });
    expect(deps.writeRuleFile).toHaveBeenCalledTimes(1);
    expect(deps.writeConfig).toHaveBeenCalledWith(
      CWD,
      expect.objectContaining({ rules: ['nextjs/app-router'] }),
    );
  });

  it('adds multiple rules preserving input order', async () => {
    const deps = makeDeps();
    const result = (await addCore(
      { rules: ['nextjs/app-router', 'drizzle/sqlite', 'typescript/strict'] },
      deps,
    )) as Extract<AddResult, { kind: 'success' }>;
    expect(result.kind).toBe('success');
    expect(result.operations.map((o) => o.name)).toEqual([
      'nextjs/app-router',
      'drizzle/sqlite',
      'typescript/strict',
    ]);
    expect(result.operations.every((o) => o.op === 'Added')).toBe(true);
    expect(deps.writeConfig).toHaveBeenCalledWith(
      CWD,
      expect.objectContaining({
        rules: ['nextjs/app-router', 'drizzle/sqlite', 'typescript/strict'],
      }),
    );
  });

  it('appends a new rule to an existing config', async () => {
    const deps = makeDeps({
      readConfig: vi.fn().mockResolvedValue(ok(makeConfig(['nextjs/app-router']))),
    });
    const result = await addCore({ rules: ['drizzle/sqlite'] }, deps);
    expect(result).toEqual({
      kind: 'success',
      operations: [{ name: 'drizzle/sqlite', op: 'Added' }],
    });
    expect(deps.writeConfig).toHaveBeenCalledWith(
      CWD,
      expect.objectContaining({ rules: ['nextjs/app-router', 'drizzle/sqlite'] }),
    );
  });

  it('classifies an already-registered rule as Updated and does not duplicate it in config', async () => {
    const deps = makeDeps({
      readConfig: vi.fn().mockResolvedValue(ok(makeConfig(['nextjs/app-router']))),
    });
    const result = await addCore({ rules: ['nextjs/app-router'] }, deps);
    expect(result).toEqual({
      kind: 'success',
      operations: [{ name: 'nextjs/app-router', op: 'Updated' }],
    });
    expect(deps.writeConfig).toHaveBeenCalledWith(
      CWD,
      expect.objectContaining({ rules: ['nextjs/app-router'] }),
    );
  });

  it('supports mixed Added and Updated in a single invocation', async () => {
    const deps = makeDeps({
      readConfig: vi.fn().mockResolvedValue(ok(makeConfig(['nextjs/app-router']))),
    });
    const result = (await addCore(
      { rules: ['nextjs/app-router', 'drizzle/sqlite'] },
      deps,
    )) as Extract<AddResult, { kind: 'success' }>;
    expect(result.kind).toBe('success');
    expect(result.operations).toEqual([
      { name: 'nextjs/app-router', op: 'Updated' },
      { name: 'drizzle/sqlite', op: 'Added' },
    ]);
    expect(deps.writeConfig).toHaveBeenCalledWith(
      CWD,
      expect.objectContaining({ rules: ['nextjs/app-router', 'drizzle/sqlite'] }),
    );
  });

  it('overwrites an existing on-disk file without warning when rule is not yet in config', async () => {
    const deps = makeDeps({
      readExistingFile: vi.fn().mockResolvedValue('old content'),
    });
    const result = await addCore({ rules: ['nextjs/app-router'] }, deps);
    expect(result).toEqual({
      kind: 'success',
      operations: [{ name: 'nextjs/app-router', op: 'Added' }],
    });
    expect(deps.writeRuleFile).toHaveBeenCalledTimes(1);
  });

  it('writes rule files before writing the config', async () => {
    const order: string[] = [];
    const deps = makeDeps({
      writeRuleFile: vi.fn().mockImplementation(async () => {
        order.push('rule');
      }),
      writeConfig: vi.fn().mockImplementation(async () => {
        order.push('config');
      }),
    });
    await addCore({ rules: ['nextjs/app-router'] }, deps);
    expect(order).toEqual(['rule', 'config']);
  });

  it('takes a snapshot of every target file before writing', async () => {
    const deps = makeDeps();
    await addCore({ rules: ['nextjs/app-router', 'drizzle/sqlite'] }, deps);
    expect(deps.readExistingFile).toHaveBeenCalledTimes(2);
  });
});

describe('addCore — rollback', () => {
  it('rolls back rule files when a write fails mid-execution', async () => {
    const writeRuleFile = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(Object.assign(new Error('EACCES'), { code: 'EACCES' }));
    const deleteFile = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({
      readConfig: vi.fn().mockResolvedValue(ok(makeConfig(['nextjs/app-router']))),
      readExistingFile: vi.fn().mockResolvedValue(null),
      writeRuleFile,
      deleteFile,
    });
    const result = (await addCore(
      { rules: ['drizzle/sqlite', 'typescript/strict'] },
      deps,
    )) as Extract<AddResult, { code: 'IO_ERROR_WRITE_RULES' }>;
    expect(result.kind).toBe('error');
    expect(result.code).toBe('IO_ERROR_WRITE_RULES');
    expect(result.rolledBack).toBe(true);
    expect(result.partialRollbackFailures).toEqual([]);
    expect(deleteFile).toHaveBeenCalledTimes(1);
    expect(deps.writeConfig).not.toHaveBeenCalled();
  });

  it('restores the previous content of overwritten files when rolling back', async () => {
    const writeRuleFile = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(Object.assign(new Error('EIO'), { code: 'EIO' }));
    const readExistingFile = vi
      .fn()
      .mockResolvedValueOnce('previous content of A')
      .mockResolvedValueOnce(null);
    const deps = makeDeps({
      writeRuleFile,
      readExistingFile,
    });
    const result = (await addCore(
      { rules: ['nextjs/app-router', 'drizzle/sqlite'] },
      deps,
    )) as Extract<AddResult, { code: 'IO_ERROR_WRITE_RULES' }>;
    expect(result.kind).toBe('error');
    expect(result.code).toBe('IO_ERROR_WRITE_RULES');
    expect(result.rolledBack).toBe(true);
    expect(writeRuleFile).toHaveBeenCalledWith(
      expect.stringContaining('nextjs-app-router.md'),
      'previous content of A',
    );
  });

  it('rolls back rule files when writeConfig fails', async () => {
    const deleteFile = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({
      writeConfig: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' })),
      deleteFile,
    });
    const result = (await addCore({ rules: ['nextjs/app-router'] }, deps)) as Extract<
      AddResult,
      { code: 'IO_ERROR_WRITE_CONFIG' }
    >;
    expect(result.kind).toBe('error');
    expect(result.code).toBe('IO_ERROR_WRITE_CONFIG');
    expect(result.rolledBack).toBe(true);
    expect(deleteFile).toHaveBeenCalledTimes(1);
  });

  it('reports partialRollbackFailures and does not loop when rollback itself fails', async () => {
    const writeRuleFile = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(Object.assign(new Error('EIO write'), { code: 'EIO' }));
    const deleteFile = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('EIO unlink'), { code: 'EIO' }));
    const deps = makeDeps({
      writeRuleFile,
      deleteFile,
    });
    const result = (await addCore(
      { rules: ['nextjs/app-router', 'drizzle/sqlite'] },
      deps,
    )) as Extract<AddResult, { code: 'IO_ERROR_WRITE_RULES' }>;
    expect(result.kind).toBe('error');
    expect(result.code).toBe('IO_ERROR_WRITE_RULES');
    expect(result.rolledBack).toBe(false);
    expect(result.partialRollbackFailures.length).toBeGreaterThan(0);
    expect(deleteFile).toHaveBeenCalledTimes(1);
  });
});
