import { describe, expect, it } from 'vitest';
import { isValidRuleName, RULE_NAME_RE, ruleNameToFilename } from './rule';

describe('RULE_NAME_RE', () => {
  it('matches <scope>/<name> with lowercase letters, digits and dashes', () => {
    expect(RULE_NAME_RE.test('nextjs/app-router')).toBe(true);
  });
});

describe('isValidRuleName', () => {
  it('accepts <scope>/<name> format', () => {
    expect(isValidRuleName('nextjs/app-router')).toBe(true);
  });

  it('accepts single-letter segments', () => {
    expect(isValidRuleName('a/b')).toBe(true);
  });

  it('accepts digits in segments', () => {
    expect(isValidRuleName('react18/strict-mode')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidRuleName('')).toBe(false);
  });

  it('rejects name without slash', () => {
    expect(isValidRuleName('nextjs')).toBe(false);
  });

  it('rejects name with extra segments', () => {
    expect(isValidRuleName('nextjs/app/router')).toBe(false);
  });

  it('rejects names with uppercase letters', () => {
    expect(isValidRuleName('Nextjs/app-router')).toBe(false);
  });

  it('rejects names with version suffix', () => {
    expect(isValidRuleName('nextjs/app-router@0.2.0')).toBe(false);
  });

  it('rejects names with whitespace', () => {
    expect(isValidRuleName('nextjs/ app-router')).toBe(false);
  });

  it('rejects empty scope', () => {
    expect(isValidRuleName('/app-router')).toBe(false);
  });

  it('rejects empty name', () => {
    expect(isValidRuleName('nextjs/')).toBe(false);
  });
});

describe('ruleNameToFilename', () => {
  it('replaces slash with dash and appends .md', () => {
    expect(ruleNameToFilename('nextjs/app-router')).toBe('nextjs-app-router.md');
  });

  it('keeps internal dashes intact', () => {
    expect(ruleNameToFilename('react-native/expo-router')).toBe('react-native-expo-router.md');
  });
});
