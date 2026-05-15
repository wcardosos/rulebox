import { describe, expect, it } from 'vitest';
import { formatInitResult } from './init';

describe('formatInitResult', () => {
  it('success with new dir', () => {
    const out = formatInitResult({ kind: 'success', dirCreated: true, output: '.rules' });
    expect(out.stderr).toBe('');
    expect(out.stdout).toMatchSnapshot();
  });

  it('success dir already existed', () => {
    const out = formatInitResult({ kind: 'success', dirCreated: false, output: '.rules' });
    expect(out.stderr).toBe('');
    expect(out.stdout).toMatchSnapshot();
  });

  it('ALREADY_INITIALIZED', () => {
    const out = formatInitResult({ kind: 'error', code: 'ALREADY_INITIALIZED' });
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatchSnapshot();
  });

  it('INVALID_OUTPUT', () => {
    const out = formatInitResult({
      kind: 'error',
      code: 'INVALID_OUTPUT',
      reason: 'must not be absolute',
    });
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatchSnapshot();
  });

  it('IO_ERROR with cause', () => {
    const out = formatInitResult({
      kind: 'error',
      code: 'IO_ERROR',
      message: 'Disk full',
      cause: 'ENOSPC',
    });
    expect(out.stdout).toBe('');
    expect(out.stderr).toMatchSnapshot();
  });
});
