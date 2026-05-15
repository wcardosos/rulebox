import { describe, expect, it, vi } from 'vitest';
import type { InitDeps } from './init';
import { initCore } from './init';

const CWD = '/project';

function makeDeps(overrides?: Partial<InitDeps>): InitDeps {
  return {
    cwd: CWD,
    configExists: vi.fn().mockResolvedValue(false),
    writeConfig: vi.fn().mockResolvedValue(undefined),
    ensureOutputDir: vi.fn().mockResolvedValue({ created: true }),
    ...overrides,
  };
}

describe('validateOutput', () => {
  it('rejects empty string', async () => {
    const result = await initCore({ output: '' }, makeDeps());
    expect(result).toMatchObject({ kind: 'error', code: 'INVALID_OUTPUT' });
  });

  it('rejects whitespace-only string', async () => {
    const result = await initCore({ output: '   ' }, makeDeps());
    expect(result).toMatchObject({ kind: 'error', code: 'INVALID_OUTPUT' });
  });

  it('rejects absolute path', async () => {
    const result = await initCore({ output: '/abs/path' }, makeDeps());
    expect(result).toMatchObject({ kind: 'error', code: 'INVALID_OUTPUT' });
  });

  it('rejects Windows-style absolute path on POSIX', async () => {
    const result = await initCore({ output: 'C:/foo' }, makeDeps());
    expect(result).toMatchObject({ kind: 'error', code: 'INVALID_OUTPUT' });
  });

  it('rejects path escaping cwd', async () => {
    const result = await initCore({ output: '../escape' }, makeDeps());
    expect(result).toMatchObject({ kind: 'error', code: 'INVALID_OUTPUT' });
  });

  it('rejects multi-hop escape', async () => {
    const result = await initCore({ output: './a/../../escape' }, makeDeps());
    expect(result).toMatchObject({ kind: 'error', code: 'INVALID_OUTPUT' });
  });

  it('rejects path pointing to cwd itself (.)', async () => {
    const result = await initCore({ output: '.' }, makeDeps());
    expect(result).toMatchObject({ kind: 'error', code: 'INVALID_OUTPUT' });
  });

  it('accepts .rules', async () => {
    const result = await initCore({ output: '.rules' }, makeDeps());
    expect(result.kind).toBe('success');
  });

  it('accepts custom/nested', async () => {
    const result = await initCore({ output: 'custom/nested' }, makeDeps());
    expect(result.kind).toBe('success');
  });
});

describe('initCore', () => {
  it('returns ALREADY_INITIALIZED when config exists', async () => {
    const deps = makeDeps({ configExists: vi.fn().mockResolvedValue(true) });
    const result = await initCore({}, deps);
    expect(result).toEqual({ kind: 'error', code: 'ALREADY_INITIALIZED' });
  });

  it('does not write anything when ALREADY_INITIALIZED', async () => {
    const deps = makeDeps({ configExists: vi.fn().mockResolvedValue(true) });
    await initCore({}, deps);
    expect(deps.writeConfig).not.toHaveBeenCalled();
    expect(deps.ensureOutputDir).not.toHaveBeenCalled();
  });

  it('returns success with dirCreated: true when dir was newly created', async () => {
    const deps = makeDeps({ ensureOutputDir: vi.fn().mockResolvedValue({ created: true }) });
    const result = await initCore({}, deps);
    expect(result).toEqual({ kind: 'success', dirCreated: true, output: '.rules' });
  });

  it('returns success with dirCreated: false when dir already existed', async () => {
    const deps = makeDeps({ ensureOutputDir: vi.fn().mockResolvedValue({ created: false }) });
    const result = await initCore({}, deps);
    expect(result).toEqual({ kind: 'success', dirCreated: false, output: '.rules' });
  });

  it('stores raw relative path in config, not resolved path', async () => {
    const deps = makeDeps();
    await initCore({ output: 'custom/dir' }, deps);
    expect(deps.writeConfig).toHaveBeenCalledWith(
      CWD,
      expect.objectContaining({ output: 'custom/dir' }),
    );
  });

  it('uses DEFAULT_OUTPUT when no --output given', async () => {
    const deps = makeDeps();
    const result = await initCore({}, deps);
    expect(result).toMatchObject({ kind: 'success', output: '.rules' });
  });

  it('returns IO_ERROR with cause when ensureOutputDir throws EACCES', async () => {
    const error = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
    const deps = makeDeps({ ensureOutputDir: vi.fn().mockRejectedValue(error) });
    const result = await initCore({}, deps);
    expect(result).toEqual({
      kind: 'error',
      code: 'IO_ERROR',
      message: 'Permission denied',
      cause: 'EACCES',
    });
  });

  it('returns IO_ERROR when writeConfig throws', async () => {
    const error = Object.assign(new Error('Disk full'), { code: 'ENOSPC' });
    const deps = makeDeps({ writeConfig: vi.fn().mockRejectedValue(error) });
    const result = await initCore({}, deps);
    expect(result).toEqual({
      kind: 'error',
      code: 'IO_ERROR',
      message: 'Disk full',
      cause: 'ENOSPC',
    });
  });

  it('validates --output before checking configExists', async () => {
    const deps = makeDeps({ configExists: vi.fn().mockResolvedValue(true) });
    const result = await initCore({ output: '' }, deps);
    expect(result).toMatchObject({ kind: 'error', code: 'INVALID_OUTPUT' });
    expect(deps.configExists).not.toHaveBeenCalled();
  });
});
