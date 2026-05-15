import { describe, expect, it } from 'vitest';
import { getRegistryRoot, readRule, ruleExists } from './registry-repository';

describe('getRegistryRoot', () => {
  it('resolves to a directory that contains the example registry', async () => {
    const root = getRegistryRoot();
    expect(typeof root).toBe('string');
    expect(root.length).toBeGreaterThan(0);
  });
});

describe('ruleExists', () => {
  it('returns true for an existing rule (example/hello-world)', async () => {
    expect(await ruleExists('example/hello-world')).toBe(true);
  });

  it('returns false when the scope does not exist', async () => {
    expect(await ruleExists('missing-scope/missing-name')).toBe(false);
  });

  it('returns false when the name does not exist within an existing scope', async () => {
    expect(await ruleExists('example/missing-name')).toBe(false);
  });
});

describe('readRule', () => {
  it('returns the rule.md contents for example/hello-world', async () => {
    const content = await readRule('example/hello-world');
    expect(content).toContain('hello-world');
  });

  it('throws when the rule does not exist', async () => {
    await expect(readRule('missing/rule')).rejects.toThrow();
  });
});
