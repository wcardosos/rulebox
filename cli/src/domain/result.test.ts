import { describe, expect, it } from 'vitest';
import { err, ok } from './result';

describe('ok', () => {
  it('creates an ok result with the given value', () => {
    expect(ok(42)).toEqual({ kind: 'ok', value: 42 });
  });

  it('works with non-primitive values', () => {
    expect(ok({ a: 1 })).toEqual({ kind: 'ok', value: { a: 1 } });
  });
});

describe('err', () => {
  it('creates an error result with the given error', () => {
    expect(err('something failed')).toEqual({ kind: 'error', error: 'something failed' });
  });

  it('works with object errors', () => {
    expect(err({ code: 'NOT_FOUND' })).toEqual({ kind: 'error', error: { code: 'NOT_FOUND' } });
  });
});
