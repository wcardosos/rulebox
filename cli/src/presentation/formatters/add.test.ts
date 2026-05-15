import { describe, expect, it } from 'vitest';
import { formatAddResult } from './add';

describe('formatAddResult', () => {
  it('success — single Added', () => {
    const out = formatAddResult({
      kind: 'success',
      operations: [{ name: 'nextjs/app-router', op: 'Added' }],
    });
    expect(out.stderr).toBe('');
    expect(out.stdout).toMatchSnapshot();
  });

  it('success — mixed Added and Updated, order preserved', () => {
    const out = formatAddResult({
      kind: 'success',
      operations: [
        { name: 'nextjs/app-router', op: 'Updated' },
        { name: 'drizzle/sqlite', op: 'Added' },
      ],
    });
    expect(out.stderr).toBe('');
    expect(out.stdout).toMatchSnapshot();
  });

  it('NO_RULES_GIVEN', () => {
    const out = formatAddResult({ kind: 'error', code: 'NO_RULES_GIVEN' });
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatchSnapshot();
  });

  it('CONFIG_NOT_FOUND', () => {
    const out = formatAddResult({ kind: 'error', code: 'CONFIG_NOT_FOUND' });
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatchSnapshot();
  });

  it('INVALID_CONFIG_JSON', () => {
    const out = formatAddResult({
      kind: 'error',
      code: 'INVALID_CONFIG_JSON',
      details: 'Unexpected token at line 3',
    });
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatchSnapshot();
  });

  it('INVALID_CONFIG_SCHEMA', () => {
    const out = formatAddResult({
      kind: 'error',
      code: 'INVALID_CONFIG_SCHEMA',
      details: "version must be '1'",
    });
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatchSnapshot();
  });

  it('OUTPUT_DIR_NOT_FOUND', () => {
    const out = formatAddResult({
      kind: 'error',
      code: 'OUTPUT_DIR_NOT_FOUND',
      path: '/project/.rules',
    });
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatchSnapshot();
  });

  it('UNKNOWN_RULES', () => {
    const out = formatAddResult({
      kind: 'error',
      code: 'UNKNOWN_RULES',
      rules: ['foo/bar', 'baz/qux'],
    });
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatchSnapshot();
  });

  it('IO_ERROR_WRITE_RULES — rolled back, no partial failures', () => {
    const out = formatAddResult({
      kind: 'error',
      code: 'IO_ERROR_WRITE_RULES',
      message: 'EACCES: permission denied',
      rolledBack: true,
      partialRollbackFailures: [],
    });
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatchSnapshot();
  });

  it('IO_ERROR_WRITE_RULES — rollback partially failed', () => {
    const out = formatAddResult({
      kind: 'error',
      code: 'IO_ERROR_WRITE_RULES',
      message: 'EIO',
      rolledBack: false,
      partialRollbackFailures: [{ path: '/project/.rules/a.md', cause: 'EIO' }],
    });
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatchSnapshot();
  });

  it('IO_ERROR_WRITE_CONFIG — rolled back', () => {
    const out = formatAddResult({
      kind: 'error',
      code: 'IO_ERROR_WRITE_CONFIG',
      message: 'ENOSPC',
      rolledBack: true,
      partialRollbackFailures: [],
    });
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatchSnapshot();
  });
});
